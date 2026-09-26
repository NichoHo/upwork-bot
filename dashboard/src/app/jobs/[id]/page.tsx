import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/app/actions/auth";
import { getDraft, getJob } from "@/lib/queue";
import { JobDetail } from "@/components/queue/job-detail";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

export default async function JobPermalinkPage({
  params,
}: PageProps<"/jobs/[id]">) {
  await requireMember();
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const draft = await getDraft(id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon weight="regular" /> Queue
      </Link>
      <JobDetail job={job} draft={draft} />
    </main>
  );
}
