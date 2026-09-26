import { requireMember } from "@/app/actions/auth";
import { getRuns } from "@/lib/queue";
import { isOlderThan } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const STALE_AFTER_MS = 90 * 60 * 1000;

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
    <main className="flex min-h-full flex-1 flex-col">
      <AppHeader member={member} />
      {isStale && (
        <Alert variant="destructive" className="m-0 rounded-none border-x-0 border-t-0">
          <AlertDescription>
            No run has started in the last 90+ minutes. A Telegram alert should already have
            fired; check the hunter machine.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-1 flex-col divide-y overflow-y-auto">
        {runs.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            No runs yet.
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="flex items-center justify-between gap-4 px-6 py-3">
              <div className="font-mono text-xs">
                <div>{new Date(run.started_at).toLocaleString()}</div>
                <div className="text-muted-foreground">{formatDuration(run.started_at, run.finished_at)}</div>
              </div>
              <div className="font-mono text-xs">
                {run.jobs_seen ?? "-"} seen &middot; {run.jobs_scored ?? "-"} scored &middot;{" "}
                {run.jobs_shortlisted ?? "-"} shortlisted
              </div>
              <div
                className={cn(
                  "font-mono text-xs capitalize",
                  run.status === "failed" && "text-destructive",
                )}
              >
                {run.status}
              </div>
              {run.error && <div className="text-destructive max-w-sm truncate text-xs">{run.error}</div>}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
