import { requireMember } from "@/app/actions/auth";
import { getRuns } from "@/lib/queue";
import { isOlderThan, STALE_AFTER_MS } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Run } from "@/lib/types";

const STATUS_VARIANT: Record<Run["status"], "success" | "warning" | "destructive"> = {
  ok: "success",
  partial: "warning",
  failed: "destructive",
};

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "still running";
  const seconds = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
}

export default async function RunsPage() {
  const member = await requireMember();
  const runs = await getRuns();
  const isStale = !!runs[0]?.started_at && isOlderThan(runs[0].started_at, STALE_AFTER_MS);

  return (
    <AppShell member={member} title="Runs">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isStale && (
          <Alert variant="destructive" className="m-0 rounded-none border-x-0 border-t-0">
            <AlertDescription>
              No run has started in the last four hours. A Telegram alert should already have
              fired; check the hunter machine.
            </AlertDescription>
          </Alert>
        )}

        {runs.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            No runs yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Seen</TableHead>
                <TableHead className="text-right">Scored</TableHead>
                <TableHead className="text-right">Shortlisted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {new Date(run.started_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {formatDuration(run.started_at, run.finished_at)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {run.jobs_seen ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {run.jobs_scored ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {run.jobs_shortlisted ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                  </TableCell>
                  <TableCell className="text-destructive max-w-sm truncate text-xs">
                    {run.error ?? ""}
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
