import Link from "next/link";
import { requireMember } from "@/app/actions/auth";
import { getAllRejected } from "@/lib/queue";
import { formatAge, formatBudget } from "@/lib/format";
import { AppHeader } from "@/components/app-header";

export default async function RejectedPage() {
  const member = await requireMember();
  const jobs = await getAllRejected();

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <AppHeader member={member} />
      <div className="border-b px-6 py-3">
        <h2 className="text-sm font-medium">Rejected ({jobs.length})</h2>
        <p className="text-muted-foreground text-xs">
          Highest score first. A good job the rubric threw away shows up near the top.
        </p>
      </div>
      {jobs.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Nothing rejected yet.
        </div>
      ) : (
        <div className="flex flex-1 flex-col divide-y overflow-y-auto">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-1 px-6 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm">{job.score ?? "-"}</span>
                <Link href={`/jobs/${job.id}`} className="text-sm hover:underline">
                  {job.title}
                </Link>
              </div>
              <span className="text-muted-foreground font-mono text-xs">
                {formatBudget(job)} &middot; {formatAge(job.published_at)}
              </span>
              {job.rejection_reason && (
                <span className="text-muted-foreground text-sm">{job.rejection_reason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
