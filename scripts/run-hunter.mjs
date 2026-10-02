#!/usr/bin/env node
// Orchestrates one hunter run: refreshes profile.md/seen.txt from Supabase,
// runs `claude -p` on hunt.md with a read-only tool allowlist, then writes
// its JSON output to Supabase and alerts Telegram. The service-role key and
// Telegram token live only in .hunter/config.json (gitignored) and are never
// passed to the LLM; it only ever sees local files via Read/Write.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HUNTER_DIR = path.join(ROOT, ".hunter");
const OUTPUT_PATH = path.join(HUNTER_DIR, "run-output.json");
const LAST_RECHECK_PATH = path.join(HUNTER_DIR, "last-recheck.txt");

const config = JSON.parse(
  readFileSync(path.join(HUNTER_DIR, "config.json"), "utf8"),
);

// Stage 0 makes one Upwork `get` call per shortlisted job, so running it on
// every 3-hourly run burns usage on jobs that rarely change that fast. Only
// hand the hunter the shortlist when this long has passed since the last
// recheck; otherwise it gets an empty list and skips Stage 0.
const RECHECK_EVERY_MS = 6 * 60 * 60 * 1000;

// Gathering, filtering and drafting don't need the largest model, and the
// hunter runs on the Pro subscription's usage limits. Override with
// HUNTER_MODEL in .hunter/config.json if drafts get noticeably worse.
const MODEL = config.HUNTER_MODEL ?? "sonnet";

function recheckDue() {
  try {
    const last = Date.parse(readFileSync(LAST_RECHECK_PATH, "utf8").trim());
    return Number.isNaN(last) || Date.now() - last >= RECHECK_EVERY_MS;
  } catch {
    return true;
  }
}

async function supabase(pathAndQuery, options = {}) {
  const res = await fetch(`${config.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Supabase ${options.method ?? "GET"} ${pathAndQuery} -> ${res.status} ${text}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

async function telegram(text) {
  await fetch(
    `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.TELEGRAM_CHAT_ID, text }),
    },
  );
}

async function recordFailedRun(startedAt, finishedAt, error, costInfo = {}) {
  await supabase("runs", {
    method: "POST",
    body: JSON.stringify({
      started_at: startedAt,
      finished_at: finishedAt,
      status: "failed",
      error,
      ...costInfo,
    }),
  }).catch((e) => console.error("failed to record failed run:", e));
}

// --output-format json wraps the run in {total_cost_usd, usage, ...} on
// stdout. Parsed separately from run-output.json (the hunter's own file,
// written via the Write tool): this is the CLI's own accounting, present
// even when the hunter's file write fails or a rule inside hunt.md errors.
function parseCostInfo(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return { cost_usd: parsed.total_cost_usd ?? null, usage: parsed.usage ?? null };
  } catch {
    return { cost_usd: null, usage: null };
  }
}

async function main() {
  const startedAt = new Date().toISOString();

  const [profileRow] = await supabase(
    "settings?key=eq.profile&select=value",
  );
  const jobRows = await supabase("jobs?select=id");
  const shortlistedRows = await supabase(
    "jobs?select=id&status=eq.shortlisted",
  );
  writeFileSync(path.join(HUNTER_DIR, "profile.md"), profileRow.value);
  writeFileSync(
    path.join(HUNTER_DIR, "seen.txt"),
    jobRows.map((r) => r.id).join("\n") + (jobRows.length ? "\n" : ""),
  );
  const doRecheck = recheckDue();
  writeFileSync(
    path.join(HUNTER_DIR, "shortlisted.json"),
    JSON.stringify(doRecheck ? shortlistedRows : []),
  );
  rmSync(OUTPUT_PATH, { force: true });

  const prompt = readFileSync(path.join(ROOT, "hunt.md"), "utf8");

  // Full MCP-qualified names: "find_jobs"/"list_accounts" alone match
  // nothing and silently grant no access. Verified 2026-09-26 by asking a
  // probe session to list its own callable tools.
  const ALLOWED_TOOLS =
    "mcp__claude_ai_Upwork__upwork__find_jobs,mcp__claude_ai_Upwork__upwork__list_accounts,Read,Write";
  // Belt and suspenders: some MCP tools (e.g. firecrawl's search/scrape)
  // were observed callable without being allowlisted at all, so name the
  // dangerous categories explicitly rather than trust default scoping.
  const DISALLOWED_TOOLS =
    "Bash,PowerShell,Edit,Agent,Workflow,WebFetch,WebSearch,NotebookEdit,mcp__firecrawl__*,mcp__playwright__*,mcp__21st__*,mcp__claude_ai_Indeed__*";

  const CLAUDE_ARGS = [
    "-p",
    "--model",
    MODEL,
    "--output-format",
    "json",
    "--allowedTools",
    ALLOWED_TOOLS,
    "--disallowedTools",
    DISALLOWED_TOOLS,
    // --permission-mode dontAsk (what an earlier session's notes said to
    // use) turned out to auto-approve EVERYTHING, including
    // manage_proposals/update_profile -- it doesn't ask, but it also
    // doesn't deny. "manual" is the mode that would normally prompt for
    // anything outside --allowedTools; --permission-prompts none then
    // denies those prompts automatically instead of hanging. Verified by
    // having a probe session attempt manage_proposals and update_profile
    // with this exact combination: both were denied, find_jobs/
    // list_accounts both worked, no hang.
    "--permission-mode",
    "manual",
    "--permission-prompts",
    "none",
  ];

  // "claude" resolves to claude.cmd on Windows, which spawnSync can only
  // launch through a shell. Passing an args array together with shell:true
  // makes Node warn (DEP0190) because it then joins args with bare spaces
  // instead of shell-quoting them; every value here is a static literal we
  // wrote, so there's nothing attacker-controlled to escape, but building
  // one pre-quoted command string sidesteps the warning and the ambiguity
  // entirely. The prompt itself goes through stdin, not argv, to stay well
  // under cmd.exe's ~8191-char command-line limit (hunt.md alone is close).
  const commandLine = ["claude", ...CLAUDE_ARGS]
    .map((part) => JSON.stringify(part))
    .join(" ");

  const result = spawnSync(commandLine, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    input: prompt,
    shell: true,
  });

  const finishedAt = new Date().toISOString();

  if (result.error) {
    const detail = `failed to launch claude: ${result.error.message}`;
    console.error(detail);
    await recordFailedRun(startedAt, finishedAt, detail);
    await telegram("Upwork hunter failed to launch. Check the logs on the hunter machine.");
    process.exitCode = 1;
    return;
  }

  const costInfo = parseCostInfo(result.stdout ?? "");

  if (result.status !== 0) {
    // With --output-format json the CLI reports its own errors (subtype,
    // result text) on stdout and leaves stderr empty.
    const detail = `claude -p exited ${result.status}: ${(result.stderr ?? "").slice(0, 500)} | stdout: ${(result.stdout ?? "").slice(0, 1500)}`;
    console.error(detail);
    await recordFailedRun(startedAt, finishedAt, detail, costInfo);
    await telegram("Upwork hunter failed to run. Check the logs on the hunter machine.");
    process.exitCode = 1;
    return;
  }

  let output;
  try {
    output = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
  } catch (err) {
    const detail = `no valid run-output.json: ${err.message}`;
    console.error(detail);
    await recordFailedRun(startedAt, finishedAt, detail, costInfo);
    await telegram("Upwork hunter ran but produced no usable output. Check the logs.");
    process.exitCode = 1;
    return;
  }

  // Only a run that actually produced output counts as a recheck; a failed
  // run leaves the timestamp alone so the next run tries Stage 0 again.
  if (doRecheck) writeFileSync(LAST_RECHECK_PATH, startedAt);

  const jobs = output.jobs ?? [];
  const shortlisted = jobs.filter((j) => j.status === "shortlisted");

  const [run] = await supabase("runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      started_at: startedAt,
      finished_at: finishedAt,
      status: "ok",
      jobs_seen: output.jobs_seen ?? jobs.length,
      jobs_scored: jobs.length,
      jobs_shortlisted: shortlisted.length,
      ...costInfo,
    }),
  });

  for (const job of jobs) {
    const { draft, ...jobRow } = job;
    await supabase("jobs?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ ...jobRow, run_id: run.id }),
    });
    if (draft) {
      await supabase("drafts", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ ...draft, job_id: job.id }),
      });
    }
  }

  // Jobs Stage 0 re-checked against live Upwork data and found no longer
  // viable (proposals climbed, client hired someone, etc). The status
  // filter guards against deleting a job someone applied to in the gap
  // between Stage 0's read and this write.
  const staleIds = output.stale_job_ids ?? [];
  for (const id of staleIds) {
    await supabase(
      `jobs?id=eq.${encodeURIComponent(id)}&status=eq.shortlisted`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    ).catch((e) => console.error(`failed to delete stale job ${id}:`, e));
  }

  if (shortlisted.length > 0) {
    const best = shortlisted.reduce((a, b) => (b.score > a.score ? b : a));
    const plural = shortlisted.length === 1 ? "" : "s";
    await telegram(
      `${shortlisted.length} Upwork job${plural} worth bidding. Best: ${best.title}, ${best.score}.`,
    );
  }

  console.log(
    `Run complete: ${jobs.length} evaluated, ${shortlisted.length} shortlisted, ${staleIds.length} stale deleted.`,
  );
}

main().catch(async (err) => {
  console.error(err);
  try {
    await telegram(`Upwork hunter crashed: ${err.message}`);
  } catch {}
  process.exitCode = 1;
});
