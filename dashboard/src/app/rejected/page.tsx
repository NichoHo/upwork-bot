import Link from "next/link";
import { requireMember } from "@/app/actions/auth";
import { getRejectedToday } from "@/lib/queue";
import { formatAge, formatBudget } from "@/lib/format";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

export default async function RejectedTodayPage() {
  await requireMember();
  const jobs = await getRejectedToday();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon weight="regular" /> Queue
      </Link>
      <h1 className="text-sm font-medium">
        Rejected today ({jobs.length})
      </h1>
      <div className="flex flex-col divide-y border-t border-b">
        {jobs.map((job) => (
          <div key={job.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm">{job.score ?? "-"}</span>
              <span className="text-sm">{job.title}</span>
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              {formatBudget(job)} &middot; {formatAge(job.published_at)}
            </span>
            {job.rejection_reason && (
              <span className="text-muted-foreground text-sm">
                {job.rejection_reason}
              </span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
