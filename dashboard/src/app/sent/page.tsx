import Link from "next/link";
import { PaperPlaneTiltIcon, TargetIcon, TrendUpIcon } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/app/actions/auth";
import { computeSentStats, getSentRows } from "@/lib/outcomes";
import { deriveOutcomeStatus } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { OutcomeStatusButtons } from "@/components/sent/outcome-status-buttons";
import { Stat } from "@/components/ui/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function pct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function SentPage() {
  const member = await requireMember();
  const rows = await getSentRows();
  const { overall, byBand } = computeSentStats(rows);

  return (
    <AppShell member={member} title="Sent">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 border-b p-6 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Sent" value={overall.sent} icon={<PaperPlaneTiltIcon />} />
          <Stat label="Reply rate" value={pct(overall.replyRate)} icon={<TrendUpIcon />} />
          <Stat label="Win rate" value={pct(overall.winRate)} icon={<TargetIcon />} />
          {byBand.map((band) => (
            <Stat
              key={band.label}
              label={`Score ${band.label}`}
              value={band.stats.sent}
              sublabel={`${pct(band.stats.replyRate)} reply, ${pct(band.stats.winRate)} win`}
            />
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Nothing submitted yet. Mark a job as submitted from the queue to see it here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Connects</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.job.id}>
                  <TableCell className="max-w-xs">
                    <Link href={`/jobs/${row.job.id}`} className="block truncate hover:underline">
                      {row.job.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {new Date(row.outcome.submitted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {row.submittedBy?.display_name ?? "unknown"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {row.outcome.connects_spent ?? "?"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {row.job.score ?? "?"}
                  </TableCell>
                  <TableCell>
                    <OutcomeStatusButtons jobId={row.job.id} status={deriveOutcomeStatus(row.outcome)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}
