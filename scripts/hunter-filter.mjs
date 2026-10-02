// The rule-based half of the hunter: everything in profile.md that is a
// plain comparison on Upwork's data lives here, so no model tokens are spent
// on it. Only judgment calls (proof match, red flags, scoring, drafting) are
// left for the model. Field names match find_jobs responses as observed on
// 2026-10-02.

const MAX_CANDIDATES = 8;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const FIXED_FLOOR = 80;

// Upwork's proposal tiers, cheapest competition first. Anything ranked above
// "10 to 15" is dropped.
const TIER_RANK = [
  [/(less|fewer) than 5/i, 0],
  [/^5 to 10/i, 1],
  [/^10 to 15/i, 2],
  [/^15 to 20/i, 3],
  [/^20 to 50/i, 4],
  [/50\+|50 or more/i, 5],
];
const MAX_TIER_RANK = 2;

export function tierRank(tier) {
  if (!tier) return null;
  for (const [re, rank] of TIER_RANK) if (re.test(tier)) return rank;
  return null;
}

// Search rows and the `get` call use the bare number ("2105849076275566483");
// job URLs use "~02" + that number. Older rows may hold either form, so
// compare on the bare number.
export function normalizeId(id) {
  const s = String(id ?? "").trim();
  if (/^~02\d+$/.test(s)) return s.slice(3);
  if (s.startsWith("~")) return s.slice(1);
  return s;
}

export function parseMoney(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && String(value).match(/\d/) ? n : null;
}

// profile.md section 3 has one line "- Dealbreaker keywords: a, b, "c d", ..."
// that may wrap onto following lines. It is edited from the dashboard, so it
// is parsed rather than copied here. Returns [] if the line is missing, in
// which case the model still applies the rule.
export function parseDealbreakers(profile) {
  const m = /Dealbreaker keywords:([\s\S]*?)(?:\n\s*-\s|\n\s*\n|$)/i.exec(profile ?? "");
  if (!m) return [];
  return m[1]
    .split(",")
    .map((k) => k.replace(/["“”]/g, "").replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchDealbreaker(text, dealbreakers) {
  const haystack = (text ?? "").toLowerCase();
  for (const k of dealbreakers) {
    if (new RegExp(`\\b${escapeRegExp(k)}\\b`, "i").test(haystack)) return k;
  }
  return null;
}

// Stage 2: drop on search-row data alone, before any `get` call. Returns the
// de-duplicated count and up to MAX_CANDIDATES survivors, lowest proposal
// tier first, then newest.
export function cheapFilter(searchJobs, { seen, dealbreakers, now = Date.now() }) {
  const byId = new Map();
  for (const job of searchJobs) {
    const id = normalizeId(job?.id);
    if (id && !byId.has(id)) byId.set(id, { ...job, id });
  }

  const survivors = [];
  for (const job of byId.values()) {
    if (seen.has(job.id)) continue;
    if (job.applied === true) continue;
    const rank = tierRank(job.proposals_tier);
    if (rank != null && rank > MAX_TIER_RANK) continue;
    if (job.job_type === "fixed") {
      const budget = parseMoney(job.budget);
      if (budget != null && budget < FIXED_FLOOR) continue;
    }
    const published = Date.parse(job.published_date ?? job.created_date ?? "");
    if (!Number.isNaN(published) && now - published > MAX_AGE_MS) continue;
    if (matchDealbreaker(`${job.title}\n${job.description_snippet}`, dealbreakers)) continue;
    survivors.push({ job, rank: rank ?? MAX_TIER_RANK + 0.5, published });
  }

  survivors.sort((a, b) => a.rank - b.rank || (b.published || 0) - (a.published || 0));
  return {
    jobsSeen: byId.size,
    candidates: survivors.slice(0, MAX_CANDIDATES).map((s) => s.job),
  };
}

function posting(get) {
  return get?.data?.marketplaceJobPosting ?? {};
}

// hunt.md's hire rate: jobs_with_hires / contracts_total, only judged once
// the client has 3+ contracts.
function hireRate(record) {
  const total = record?.contracts_total;
  if (!total || total < 3) return null;
  return (record.jobs_with_hires ?? 0) / total;
}

// Stage 3 hard skips that are plain comparisons on `get` data. Returns the
// reason a rule fired, or null. Used both for new candidates and for
// re-checking the shortlist (Stage 0). A recheck ignores `applied`: a
// shortlisted job someone already bid on must not be deleted as stale.
export function hardSkip(get, { recheck = false } = {}) {
  const p = posting(get);
  const activity = p.activityStat?.jobActivity ?? {};
  const persons = p.contractTerms?.personsToHire ?? 1;
  if (get.can_apply === false) return "can_apply is false";
  if (!recheck && get.applied === true) return "already applied";
  if (p.workFlowState?.status && p.workFlowState.status !== "ACTIVE")
    return `job is ${p.workFlowState.status.toLowerCase()}`;
  if ((activity.totalHired ?? 0) >= persons) return `already hired ${activity.totalHired} of ${persons}`;
  if ((activity.totalOffered ?? 0) >= 1) return `client already sent ${activity.totalOffered} offer(s)`;
  if ((activity.totalInvitedToInterview ?? 0) >= 3)
    return `already interviewing ${activity.totalInvitedToInterview}`;
  const rate = hireRate(get.client_record);
  if (rate != null && rate < 0.4) {
    const r = get.client_record;
    return `client hire rate ${Math.round(rate * 100)}% (${r.jobs_with_hires}/${r.contracts_total} contracts)`;
  }
  const fixed = parseMoney(p.contractTerms?.fixedPriceContractTerms?.amount?.rawValue);
  if (fixed != null && fixed < FIXED_FLOOR) return `fixed budget $${fixed} under the $${FIXED_FLOOR} floor`;
  return null;
}

// The `jobs` row for a job that had a `get` call, from Upwork's data alone.
// The judge step adds score, service line, proof and bid account on top.
export function buildRow(searchJob, get) {
  const p = posting(get);
  const terms = p.contractTerms ?? {};
  const activity = p.activityStat?.jobActivity ?? {};
  const record = get.client_record ?? {};
  const client = searchJob?.client ?? {};
  const isHourly = terms.contractType === "HOURLY" || searchJob?.job_type === "hourly";
  return {
    id: normalizeId(p.id ?? searchJob?.id),
    url: p.url ?? searchJob?.url,
    title: p.content?.title ?? searchJob?.title,
    description: p.content?.description ?? "",
    budget_type: isHourly ? "hourly" : "fixed",
    budget_amount: isHourly
      ? null
      : parseMoney(terms.fixedPriceContractTerms?.amount?.rawValue ?? searchJob?.budget),
    rate_min: null,
    rate_max: null,
    proposals_tier: searchJob?.proposals_tier ?? null,
    client_country: client.country ?? p.clientCompanyPublic?.country?.name ?? null,
    client_spend: parseMoney(record.spend_total ?? client.total_spent),
    client_rating: client.rating ?? record.feedback_score ?? null,
    client_reviews: client.total_reviews ?? record.feedback_count ?? null,
    client_hires: record.jobs_with_hires ?? null,
    client_contracts_total: record.contracts_total ?? null,
    total_hired: activity.totalHired ?? null,
    invites_sent: activity.invitesSent ?? null,
    invited_to_interview: activity.totalInvitedToInterview ?? null,
    total_offered: activity.totalOffered ?? null,
    connects_cost: get.connects_cost ?? null,
    skills: searchJob?.skills ?? null,
    published_at: searchJob?.published_date ?? null,
    score: null,
    score_breakdown: null,
    service_line: null,
    proof_urls: null,
    bid_account: null,
    status: "rejected",
    rejection_reason: null,
  };
}

// What the judge model sees per job: the full description and every field
// a scoring rule uses, without the work-history and bid-stat bulk a raw
// `get` carries.
export function judgeInput(row, get) {
  const p = posting(get);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    published_at: row.published_at,
    proposals_tier: row.proposals_tier,
    skills: row.skills,
    category: p.classification?.subCategory?.preferredLabel ?? null,
    contract: p.contractTerms ?? null,
    client: {
      country: row.client_country,
      rating: row.client_rating,
      reviews: row.client_reviews,
      record: get.client_record ?? null,
      recent_reviews: (get.client_feedback?.reviews ?? []).slice(0, 3).map((r) => r.comment),
    },
    activity: p.activityStat?.jobActivity ?? null,
    preferred_qualifications: get.preferred_qualifications ?? null,
    preferred_locations: get.preferred_locations ?? null,
    connects_cost: row.connects_cost,
  };
}
