# Proposal Desk — Blueprint

An internal dashboard for SkyDeck Labs. A scheduled agent finds Upwork jobs
worth bidding on, scores them, and drafts the proposal. Two people review the
queue, copy the draft, and submit on Upwork themselves.

**Status:** planning. No code written yet.
**Audience:** Nicholas Ho and Waleed Khan. Nobody else.
**Security tier:** T2, Internal/Team. See Phase 6.
**Scaling:** not applicable. The user base is fixed at two people, so this
project gets no scaling work. Re-check if that changes.

---

## 1. The problem

Nicholas has sent many proposals and won one job. The research says the cause
is targeting, not writing: most proposals went to crowded posts, to clients
who never hire, or to jobs already filled. Upwork charges Connects per
proposal, so volume is expensive and it lowers reply rate.

The fix is a strict filter and a good draft. Both are slow by hand, and the
window that matters is the first two hours after a job is posted.

### What the dashboard must do

1. Show only jobs that survived every filter, ranked by score.
2. Show why each job scored what it did, so the rubric can be corrected.
3. Hand over a finished cover letter and screening answers, ready to paste.
4. Record what was submitted and what happened next, so the rubric improves.
5. Stay quiet when there is nothing worth bidding on.

### What it must not do

It must never submit a proposal. Upwork's automation policy prohibits any
tool that sends a proposal without a human. A human reads and submits every
one, on upwork.com.

---

## 2. Architecture

Four parts. Only the dashboard is new.

```
  ┌──────────────────────────────────────────────┐
  │  HUNTER                                      │
  │  Nicholas's PC, Task Scheduler, hourly       │
  │                                              │
  │  claude -p  ──►  Upwork MCP (official)       │
  │       │           search → get → score       │
  │       │           → draft                    │
  │       ▼                                      │
  │  writes rows                                 │
  └───────┬──────────────────────────────────────┘
          │
          ▼
  ┌──────────────────┐        ┌────────────────────┐
  │  SUPABASE        │◄───────┤  DASHBOARD         │
  │  Postgres + RLS  │        │  Next.js / Vercel  │
  │  Auth            │───────►│  Nicholas, Waleed  │
  └──────────────────┘        └────────────────────┘
          │
          ▼
  ┌──────────────────┐
  │  TELEGRAM        │  "3 jobs found. Best: 84."
  └──────────────────┘
```

### Why this shape

**The hunter stays on a local machine.** It needs the Upwork MCP, which
authenticates through Nicholas's OAuth session. Moving it to a server means
re-solving that. Local is simpler and good enough.

**Supabase is the join point.** Both people reach the same queue from
different machines. Without it, the shortlist is a markdown file on one PC.

**The dashboard never calls Upwork.** It only reads and writes Supabase. This
keeps the Upwork surface in one place and keeps secrets off the web tier.

**Telegram carries the alert only.** The message says a job was found. All
detail lives in the dashboard.

### Known single point of failure

If Nicholas's PC is asleep, no jobs are found. The dashboard shows the last
run time so this is visible rather than silent. Accepted for now. If it
becomes a problem, the hunter moves to a small always-on box.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Hunter | Windows Task Scheduler, `claude -p` | Already working. Runs on the Claude Pro subscription, not per-token billing. |
| Upwork access | Official Upwork MCP, `mcp.upwork.com/mcp` | Free, OAuth, sanctioned. No API key needed, and the $25k key requirement does not apply. |
| Database | Supabase Postgres | Already connected. Gives Auth and row-level security without extra services. |
| Auth | Supabase Auth, magic link | No passwords to store or hash. Two allowlisted emails. |
| Web framework | Next.js 15, App Router, React Server Components | Reads happen on the server, so the anon key never does sensitive work in the browser. |
| Supabase client | `@supabase/ssr` | Puts the session in httpOnly cookies, not `localStorage`. |
| Styling | Tailwind v4 | Current version. Use `@tailwindcss/postcss`, not the v3 plugin. |
| Components | shadcn/ui | You own the code, so it can be made dense. Never ship it in default state. |
| Icons | `@phosphor-icons/react`, `strokeWidth` 1.5 | One family, no hand-drawn SVG paths. |
| Fonts | Geist, Geist Mono, via `next/font` | Mono carries every number. Self-hosted, no external font link. |
| Notification | Telegram Bot API | Reaches the phone. One `curl` call from the hunter. |
| Hosting | Vercel | Free tier covers two users. |
| Validation | Zod | One schema per API route, shared with the client. |

Nothing here is speculative. Every item does a job the project already has.

---

## 4. Data model

Five tables. All live in the `public` schema with RLS on.

### `members`

The allowlist. Two rows.

| Column | Type | Note |
|---|---|---|
| `user_id` | `uuid` PK | References `auth.users` |
| `email` | `text` | Unique |
| `display_name` | `text` | Shown on drafts they edit |
| `upwork_account` | `text` | `skydeck` or `nicholas` |
| `created_at` | `timestamptz` | |

Every RLS policy checks membership in this table. That is the whole
authorization model, and it is small enough to verify by reading it.

### `jobs`

One row per Upwork job the hunter evaluated, kept or rejected.

| Column | Type | Note |
|---|---|---|
| `id` | `text` PK | Upwork job id |
| `url`, `title` | `text` | |
| `description` | `text` | Client-written. Untrusted. Always escaped on render. |
| `budget_type` | `text` | `fixed` or `hourly` |
| `budget_amount`, `rate_min`, `rate_max` | `numeric` | |
| `proposals_tier` | `text` | "Fewer than 5", "5 to 10", and so on |
| `client_country`, `client_spend`, `client_rating`, `client_reviews` | | From search |
| `client_hires`, `client_contracts_total` | `int` | From `get`. The real hire rate. |
| `total_hired`, `invites_sent`, `invited_to_interview`, `total_offered` | `int` | From `get`. These kill dead jobs. |
| `connects_cost` | `int` | |
| `skills` | `text[]` | |
| `published_at`, `first_seen_at` | `timestamptz` | |
| `score` | `int` | 0 to 100 |
| `score_breakdown` | `jsonb` | Every rule that fired, with its points |
| `service_line` | `text` | Which of our lines this matches |
| `proof_urls` | `text[]` | The live work we would cite |
| `bid_account` | `text` | `skydeck` or `nicholas` |
| `status` | `text` | `shortlisted`, `rejected`, `applied`, `expired` |
| `rejection_reason` | `text` | Null unless rejected |
| `run_id` | `uuid` FK | |

`score_breakdown` is what makes the rubric tunable. Without it you cannot
tell a bad rule from a bad job.

### `drafts`

| Column | Type | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `job_id` | `text` FK | |
| `cover_letter` | `text` | |
| `screening_answers` | `jsonb` | Array of question and answer |
| `bid_amount` | `numeric` | |
| `milestones` | `jsonb` | Fixed-price only |
| `todo_notes` | `text[]` | Explicit instructions from the post, such as a required word |
| `version` | `int` | Increments on edit |
| `edited_by` | `uuid` FK | Null while untouched |
| `created_at`, `updated_at` | `timestamptz` | |

### `runs`

Health log. Makes silent failure visible.

| Column | Type |
|---|---|
| `id` | `uuid` PK |
| `started_at`, `finished_at` | `timestamptz` |
| `status` | `text`: `ok`, `partial`, `failed` |
| `jobs_seen`, `jobs_scored`, `jobs_shortlisted` | `int` |
| `error` | `text` |

### `outcomes`

The feedback loop. This is what turns guesses into measurements.

| Column | Type | Note |
|---|---|---|
| `job_id` | `text` PK FK | |
| `submitted_at`, `submitted_by` | | |
| `connects_spent` | `int` | |
| `replied_at`, `interviewed_at`, `hired_at`, `closed_at` | `timestamptz` | Null until it happens |
| `notes` | `text` | |

After thirty submissions this table answers the real question: which score
bands actually convert. Then the thresholds stop being estimates.

---

## 5. Screens

Five. Keyboard first, because this tool gets used in thirty-second bursts.

### 5.1 Queue (home)

The only screen that matters. Master and detail, side by side.

```
┌─────────────────────────┬──────────────────────────────────────────┐
│ QUEUE          3 new    │  Shopify theme fix for beauty brand      │
│                         │  upwork.com/jobs/~021...        [Open ↗] │
│ ▎84  Shopify theme fix  │                                          │
│     $250 · <5 · 2h      │  84   Fixed $250 · Fewer than 5 · 2h old │
│     ────────────────    │  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                │
│  76  WooCommerce speed  │  Client  11/14 hired · $4,882 · 4.78     │
│     $400 · <5 · 5h      │  Bid as  SkyDeck        Connects  14     │
│     ────────────────    │                                          │
│  71  Next.js landing    │  WHY 84                                  │
│     $800 · 5-10 · 11h   │  +30 Fewer than 5 proposals              │
│                         │  +20 Exact proof: skinchemistry, safa    │
│ ─────────────────────   │  +18 Client hire rate 79%                │
│ REJECTED TODAY     14   │  +10 Posted 2 hours ago                  │
│                         │   +6 Scope clear, deadline stated        │
│                         │                                          │
│                         │  ⚠ TODO  Post asks for 2-4 Shopify URLs  │
│                         │                                          │
│                         │  COVER LETTER            [Copy]  [Edit]  │
│                         │  Your product pages load a 2.4 MB hero…  │
│                         │                                          │
│                         │  SCREENING (2)                   [Copy]  │
│                         │  Q Describe recent similar projects      │
│                         │  A We built two beauty Shopify stores…   │
│                         │                                          │
│                         │  [Mark as submitted]      [Skip, reason] │
└─────────────────────────┴──────────────────────────────────────────┘
```

**Density choices.** No cards. Rows are separated by hairlines. The score is
a large mono numeral with a thin underline whose width tracks the value. No
coloured badge per band, because five colours of pill is noise, not signal.
State shows as a 3px left border on the row.

**The WHY block is not decoration.** It is how you catch a broken rule. If
every 80-plus job scores high on the same term, that term is doing no work.

**Keyboard.** `j` and `k` move, `Enter` opens on Upwork, `c` copies the
letter, `a` copies all screening answers, `s` marks submitted, `x` skips with
a reason. Shortcuts are listed under `?`.

### 5.2 Job detail (full page)

Same content as the right pane, at full width, with the complete job
description. Reachable by permalink so one person can send the other a link.

### 5.3 Sent

Every submission with its outcome. Columns: date, job, who submitted,
Connects spent, score at submission, and status. Status is set by hand:
waiting, replied, interviewing, won, lost.

At the top, three numbers in mono: proposals sent, reply rate, win rate. Each
also broken out by score band. This is the page that tells you whether the
whole system works.

### 5.4 Runs

One row per hunter run. Time, duration, jobs seen, scored, shortlisted, and
status. A failed or missing run shows immediately, which matters because the
worst failure mode here is silence that looks like "no good jobs today".

### 5.5 Settings

Edits the rubric without touching code:

- Service lines and their proof URLs
- Score weights and the shortlist threshold
- Budget floors, dealbreaker keywords, red flags
- Cover letter rules, including the banned phrase list
- Telegram target
- Which account bids on which service line

This is `profile.md` behind a form. The hunter reads it from the database on
every run, so a change takes effect on the next hour.

---

## 6. Design system

### Foundation

shadcn/ui on Tailwind v4, Radix primitives underneath. One system, no mixing.
shadcn defaults get replaced: tighter radii, tighter spacing, smaller type.

### Tokens

**Type.** Geist for text, Geist Mono for every number, score, money value,
date, and count. Body is 13px, not 16px. This is a tool, not an article.

**Colour.** Zinc neutrals. One accent, electric blue, used only for
interactive elements and focus rings. Never for decoration, and never a
second accent anywhere.

State colours are the only exception, and they appear only as a 3px left
border or a small dot where the dot means something:

| State | Colour |
|---|---|
| Shortlisted, untouched | Blue |
| Draft edited | Amber |
| Submitted | Green |
| Skipped | Zinc |

**Shape.** One radius, 6px, everywhere. No pills next to squares.

**Elevation.** Almost none. Hairlines and spacing carry hierarchy. Shadows
appear only on overlays, tinted to the background hue, never pure black.

**Dark mode.** Both modes, built from the start, following
`prefers-color-scheme` with a manual toggle. Off-black and off-white, never
`#000` or `#fff`. Contrast meets WCAG AA at minimum.

### Motion

`MOTION_INTENSITY 2`. Feedback only. `:active` gives `scale(0.98)`. Rows
change background on hover. Copy buttons confirm for 1.2 seconds. Nothing
animates on scroll, nothing loops, nothing slides. Everything respects
`prefers-reduced-motion`.

A triage tool that animates is a triage tool that wastes your time.

### Required states

Every list and every panel ships four states, not one:

- **Loading.** Skeleton rows shaped like real rows. No spinners.
- **Empty.** "Nothing cleared 70 today. 14 jobs checked and rejected." with a
  link to the rejection list. Empty is the normal case here, so it must read
  as working, not broken.
- **Error.** Inline, with the actual problem and a retry.
- **Stale.** If the last run is over two hours old, a banner says so. Stale
  data that looks fresh is the most dangerous state this app has.

### Anti-slop rules carried over

No purple gradients. No three equal feature cards. No fake avatars. No
invented precise statistics. No decorative status dots. No em dashes or en
dashes in any visible string. Icons come from Phosphor only.

---

## 7. Phases

### Phase 0 — Foundation

- Supabase project, five tables, RLS on every one from the first migration
- Magic-link auth, two allowlisted emails, membership check
- Seed `members`
- Next.js app, Tailwind v4, shadcn/ui, tokens, both themes
- Deploy an empty authenticated shell to Vercel

**Done when:** both people can log in, nobody else can, and both themes work.

### Phase 1 — Hunter writes to the database

- Move `profile.md` into the `settings` table
- Hunter writes `runs`, `jobs`, and `drafts` rows instead of markdown
- Service-role key stays on the local machine and never reaches the web app
- Telegram alert on shortlisted jobs, and on failure

**Done when:** an hourly run fills the database and a Telegram message arrives.

### Phase 2 — Queue, read only

- Queue screen, master and detail
- Score, breakdown, client record, TODO notes, letter, screening answers
- Loading, empty, error, and stale states
- Keyboard navigation

**Done when:** Nicholas can triage a real day's jobs from the dashboard alone.

### Phase 3 — Actions

- Copy letter, copy answers, copy both
- Edit a draft, with version and `edited_by`
- Mark submitted, which writes an `outcomes` row
- Skip with a reason, which writes `rejection_reason`

**Done when:** a proposal goes out end to end without opening a text file.

### Phase 4 — Outcomes and tuning

- Sent screen with reply, interview, and win tracking
- Rates by score band
- Rejection review, to catch good jobs the rubric threw away
- Settings screen editing the rubric

**Done when:** the threshold can be changed based on measured conversion.

### Phase 5 — Reliability

- Run health on the dashboard, and a Telegram alert on a missed run
- Retry on a failed Upwork call, without aborting the whole run
- Expire jobs older than seven days
- Weekly summary message

**Done when:** a broken hunter is noticed within two hours.

### Phase 6 — Security and hardening

Tier T2, Internal/Team. Selected from `~/.claude/security-phase-checklist.md`.
No scaling work, because the user base is fixed at two.

**Prompt injection. Read this one first.**

Job descriptions are written by strangers and fed to an LLM that holds a live
Upwork session. That session can send messages, edit the profile, and submit
proposals. This is the most serious risk in the project, and it is specific to
how this app works.

- The hunter's `--allowedTools` allowlist contains read tools only:
  `find_jobs`, `list_accounts`, plus local `Read` and `Write`. Never
  `manage_proposals`, `send_message`, `update_profile`, or `update_agency`.
- Keep job text separated from instructions. The MCP already wraps client text
  in `untrusted_participant_content` tags. Keep them, and instruct the model
  to treat everything inside as data.
- Treat model output as untrusted. Escape it before rendering. Never let it
  build a shell command or a query.
- Any job description containing text aimed at an AI agent gets flagged as a
  red flag and surfaced in the UI, not acted on.
- Cap hunter runs per day so a loop cannot drain the subscription.

**Secrets**

- Every key stays server-side. The browser bundle carries no secret.
- `.gitignore` covers `.env*` before the first commit. A committed secret is
  burned and gets rotated, not deleted.
- The frontend uses the anon key. The service-role key exists only on the
  hunter machine.
- Rotate on a schedule and immediately if either person leaves.

**Database and access**

- RLS on all five tables. No `USING (true)`.
- Every policy checks membership in `members`. Both people see all rows,
  because the data is shared, but no unauthenticated request sees anything.
- Supabase client only. No string-concatenated SQL.
- Confirm the database is not reachable from the open internet.
- Field-level encryption is not needed here. There is no payment, health, or
  government ID data.

**Auth**

- Authorization runs on the server for every protected action. A hidden
  button is not a security boundary.
- Write endpoints accept only the fields they should. Reject stray fields.
- Supabase Auth handles sessions. `@supabase/ssr` puts them in httpOnly
  cookies, never `localStorage`.
- The runs and settings screens get the same auth check as everything else.
  Verify this by hand.

**Input and output**

- Validate every input server-side with Zod. Client validation is UX only.
- Escape all job text on render. Never `dangerouslySetInnerHTML`.
- Never write raw job text into a log line, to prevent log injection.
- API responses return only the fields the screen uses.

**Rate limiting and cost**

- Rate-limit every route, tighter on auth.
- Billing caps and usage alerts on Supabase and Vercel.

**Dependencies**

- `npm audit` before each deploy.
- Confirm a package exists and is the real one before installing it. AI tools
  hallucinate package names and attackers register them.

**Deployment**

- Force HTTPS.
- Security headers: `Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Strict-Transport-Security`.
- Debug off in production. No source maps, no `.git` served.
- Generic errors to the browser. Full detail to private logs, with no secrets.
- Logging and monitoring for errors and unusual activity.
- Two-factor authentication on every account that can affect this app:
  Supabase, Vercel, GitHub, Upwork, and Telegram.

**Before launch**

Walk the list by hand. Broken access control is the most common flaw in
AI-written code, and it usually looks fine until someone checks.

---

## 8. Open questions

1. Does the hunter machine stay awake enough, or does it need a small
   always-on host?
2. Should Waleed run a second hunter on his own Upwork session, so searches
   reflect both accounts' recommendations?
3. Does `manage_proposals` support the agency's assigned-member submit, the
   way Waleed's own app does with `selectedContractor`? Worth testing before
   Phase 3.
4. Confirm with Upwork Support that scheduled runs with AI scoring and stored
   output are acceptable. Draft message already written.
5. What reply rate justifies Freelancer Plus at $20 a month? The `outcomes`
   table will answer this by about proposal thirty.
