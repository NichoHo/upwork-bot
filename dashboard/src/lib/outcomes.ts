import { createClient } from "@/lib/supabase/server";
import { deriveOutcomeStatus } from "@/lib/format";
import type { Job, Member, Outcome } from "@/lib/types";

export type SentRow = {
  outcome: Outcome;
  job: Pick<Job, "id" | "title" | "url" | "score" | "bid_account">;
  submittedBy: Pick<Member, "display_name"> | null;
};

export async function getSentRows(): Promise<SentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outcomes")
    .select(
      "*, job:jobs(id, title, url, score, bid_account), submittedBy:members(display_name)",
    )
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { job, submittedBy, ...outcome } = row;
    return { outcome, job, submittedBy };
  }) as SentRow[];
}

export type SentStats = {
  sent: number;
  replyRate: number | null;
  winRate: number | null;
};

const SCORE_BANDS = [
  { label: "70-84", min: 70, max: 84 },
  { label: "85+", min: 85, max: 100 },
] as const;

export function computeSentStats(rows: SentRow[]): {
  overall: SentStats;
  byBand: { label: string; stats: SentStats }[];
} {
  const stats = (subset: SentRow[]): SentStats => {
    const sent = subset.length;
    if (sent === 0) return { sent: 0, replyRate: null, winRate: null };
    const replied = subset.filter((r) => deriveOutcomeStatus(r.outcome) !== "waiting").length;
    const won = subset.filter((r) => deriveOutcomeStatus(r.outcome) === "won").length;
    return { sent, replyRate: replied / sent, winRate: won / sent };
  };

  return {
    overall: stats(rows),
    byBand: SCORE_BANDS.map((band) => ({
      label: band.label,
      stats: stats(rows.filter((r) => r.job.score !== null && r.job.score >= band.min && r.job.score <= band.max)),
    })),
  };
}
