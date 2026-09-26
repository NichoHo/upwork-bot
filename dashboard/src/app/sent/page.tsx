import Link from "next/link";
import { requireMember } from "@/app/actions/auth";
import { computeSentStats, getSentRows } from "@/lib/outcomes";
import { deriveOutcomeStatus } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { OutcomeStatusButtons } from "@/components/sent/outcome-status-buttons";

function pct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function SentPage() {
  const member = await requireMember();
  const rows = await getSentRows();
  const { overall, byBand } = computeSentStats(rows);

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <AppHeader member={member} />

      <div className="flex gap-8 border-b px-6 py-4 font-mono">
        <div>
          <div className="text-muted-foreground text-xs">SENT</div>
          <div className="text-2xl">{overall.sent}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">REPLY RATE</div>
          <div className="text-2xl">{pct(overall.replyRate)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">WIN RATE</div>
          <div className="text-2xl">{pct(overall.winRate)}</div>
        </div>
        {byBand.map((band) => (
          <div key={band.label}>
            <div className="text-muted-foreground text-xs">{band.label}</div>
            <div className="text-sm">
              {band.stats.sent} sent, {pct(band.stats.replyRate)} reply, {pct(band.stats.winRate)} win
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Nothing submitted yet. Mark a job as submitted from the queue to see it here.
        </div>
      ) : (
        <div className="flex flex-1 flex-col divide-y overflow-y-auto">
          {rows.map((row) => (
            <div key={row.job.id} className="flex items-center justify-between gap-4 px-6 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/jobs/${row.job.id}`} className="truncate text-sm hover:underline">
                  {row.job.title}
                </Link>
                <div className="text-muted-foreground font-mono text-xs">
                  {new Date(row.outcome.submitted_at).toLocaleDateString()} &middot;{" "}
                  {row.submittedBy?.display_name ?? "unknown"} &middot; {row.outcome.connects_spent ?? "?"} connects
                  &middot; score {row.job.score ?? "?"}
                </div>
              </div>
              <OutcomeStatusButtons jobId={row.job.id} status={deriveOutcomeStatus(row.outcome)} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
