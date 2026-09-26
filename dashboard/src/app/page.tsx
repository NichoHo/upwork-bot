import Link from "next/link";
import { requireMember } from "@/app/actions/auth";
import { getDraft, getEditedJobIds, getJob, getLatestRun, getRejectedToday, getShortlistedJobs } from "@/lib/queue";
import { formatScreeningAnswers, isOlderThan } from "@/lib/format";
import { JobDetail } from "@/components/queue/job-detail";
import { QueueShell } from "@/components/queue/queue-shell";
import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export default async function QueuePage({
  searchParams,
}: PageProps<"/">) {
  const member = await requireMember();
  const { job: jobParam } = await searchParams;
  const selectedJobId = Array.isArray(jobParam) ? jobParam[0] : jobParam;

  const [jobs, latestRun, rejectedToday] = await Promise.all([
    getShortlistedJobs(),
    getLatestRun(),
    getRejectedToday(),
  ]);
  const editedJobIds = await getEditedJobIds(jobs.map((j) => j.id));

  const activeId = selectedJobId ?? jobs[0]?.id ?? null;
  const [selectedJob, draft] = activeId
    ? await Promise.all([getJob(activeId), getDraft(activeId)])
    : [null, null];

  const isStale = !!latestRun?.finished_at && isOlderThan(latestRun.finished_at, STALE_AFTER_MS);

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <AppHeader member={member} />

      {isStale && latestRun?.finished_at && (
        <Alert variant="destructive" className="m-0 rounded-none border-x-0 border-t-0">
          <AlertDescription>
            Last run finished {new Date(latestRun.finished_at).toLocaleString()}. That&apos;s
            over two hours ago; the hunter may have stopped running.
          </AlertDescription>
        </Alert>
      )}

      {jobs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm font-medium">Nothing cleared 70 today.</p>
          <p className="text-muted-foreground text-sm">
            {rejectedToday.length} job{rejectedToday.length === 1 ? "" : "s"} checked and
            rejected.{" "}
            {rejectedToday.length > 0 && (
              <Link href="/rejected" className="text-primary underline">
                See why
              </Link>
            )}
          </p>
        </div>
      ) : (
        <QueueShell
          jobs={jobs}
          selectedId={activeId}
          editedJobIds={editedJobIds}
          coverLetter={draft?.cover_letter ?? null}
          answersText={draft?.screening_answers?.length ? formatScreeningAnswers(draft.screening_answers) : null}
        >
          {selectedJob ? (
            <JobDetail job={selectedJob} draft={draft} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Select a job
            </div>
          )}
        </QueueShell>
      )}
    </main>
  );
}
