import type { Job, Outcome, OutcomeStatus, ScreeningAnswer } from "@/lib/types";

export function deriveOutcomeStatus(outcome: Outcome): OutcomeStatus {
  if (outcome.hired_at) return "won";
  if (outcome.closed_at) return "lost";
  if (outcome.interviewed_at) return "interviewing";
  if (outcome.replied_at) return "replied";
  return "waiting";
}

// The Upwork MCP wraps client-written text in these tags so an LLM treats it
// as data, not instructions (see CLAUDE.md hard constraint #5). They carry no
// meaning for a human reader, so strip them for display only; the text
// itself is still rendered as plain text, never dangerouslySetInnerHTML, so
// this changes nothing about how it's escaped.
export function stripUntrustedTags(text: string): string {
  return text
    .replace(/<untrusted_participant_content>/g, "")
    .replace(/<\/untrusted_participant_content>/g, "")
    .trim();
}

export function formatScreeningAnswers(answers: ScreeningAnswer[] | null | undefined): string {
  return (answers ?? []).map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n");
}

export function isOlderThan(iso: string, ms: number): boolean {
  return Date.now() - new Date(iso).getTime() > ms;
}

export function formatAge(iso: string | null): string {
  if (!iso) return "unknown age";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m old`;
  if (hours < 48) return `${Math.round(hours)}h old`;
  return `${Math.round(hours / 24)}d old`;
}

export function formatMoney(amount: number | null): string {
  if (amount === null) return "—";
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatBudget(job: Job): string {
  if (job.budget_type === "hourly") {
    const min = job.rate_min !== null ? `$${job.rate_min}` : null;
    const max = job.rate_max !== null ? `$${job.rate_max}` : null;
    if (min && max) return `${min}-${max}/hr`;
    if (min) return `${min}+/hr`;
    return "hourly";
  }
  return job.budget_amount !== null ? formatMoney(job.budget_amount) : "—";
}

export function formatClientRecord(job: Job): string | null {
  if (job.client_hires === null && job.client_spend === null) return null;
  const parts: string[] = [];
  if (job.client_hires !== null && job.client_contracts_total !== null) {
    parts.push(`${job.client_hires}/${job.client_contracts_total} hired`);
  }
  if (job.client_spend !== null) parts.push(formatMoney(job.client_spend));
  if (job.client_rating !== null) parts.push(job.client_rating.toFixed(2));
  return parts.length ? parts.join(" · ") : null;
}
