import Link from "next/link";
import { requireMember } from "@/app/actions/auth";
import { getAllRejected } from "@/lib/queue";
import { formatAge, formatBudget } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function RejectedPage() {
  const member = await requireMember();
  const jobs = await getAllRejected();

  return (
    <AppShell member={member} title="Rejected">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <p className="text-muted-foreground border-b px-6 py-3 text-xs">
          {jobs.length} job{jobs.length === 1 ? "" : "s"}, highest score first. A good job the
          rubric threw away shows up near the top.
        </p>

        {jobs.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Nothing rejected yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {job.score ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <Link href={`/jobs/${job.id}`} className="block truncate hover:underline">
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {formatBudget(job)}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {formatAge(job.published_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm truncate text-xs">
                    {job.rejection_reason ?? "—"}
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
