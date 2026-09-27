import { ArrowSquareOutIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/queue/copy-button";
import { EditableCoverLetter } from "@/components/queue/editable-cover-letter";
import { formatAge, formatBudget, formatClientRecord, formatScreeningAnswers, stripUntrustedTags } from "@/lib/format";
import type { Draft, Job, JobStatus } from "@/lib/types";

const STATUS_VARIANT: Record<JobStatus, "primary" | "success" | "default"> = {
  shortlisted: "primary",
  applied: "success",
  rejected: "default",
  expired: "default",
};

export function JobDetail({ job, draft }: { job: Job; draft: Draft | null }) {
  const clientRecord = formatClientRecord(job);
  const answersText = formatScreeningAnswers(draft?.screening_answers);
  const bothText = draft?.cover_letter ? `${draft.cover_letter}\n\n${answersText}` : answersText;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-medium">{job.title}</h2>
          <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground font-mono text-xs inline-flex items-center gap-1"
        >
          {job.url.replace(/^https?:\/\//, "")}
          <ArrowSquareOutIcon weight="regular" />
        </a>
      </div>

      <div className="rounded-lg border bg-card p-4">
        {job.score !== null && (
          <div className="mb-2">
            <span className="font-mono text-3xl font-medium tabular-nums">{job.score}</span>
            <div className="bg-border mt-1.5 h-1 w-28 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${job.score}%` }}
              />
            </div>
          </div>
        )}
        <p className="font-mono text-xs text-muted-foreground">
          {formatBudget(job)} &middot; {job.proposals_tier ?? "proposals unknown"} &middot;{" "}
          {formatAge(job.published_at)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-muted-foreground text-xs">Client</div>
          <div className="font-mono text-xs">{clientRecord ?? "no history"}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-muted-foreground text-xs">Bid as</div>
          <div className="font-mono text-xs capitalize">
            {job.bid_account ?? "unset"}
            {job.connects_cost !== null ? ` · ${job.connects_cost} connects` : ""}
          </div>
        </div>
      </div>

      {job.status === "rejected" && job.rejection_reason && (
        <div>
          <div className="text-muted-foreground mb-1 text-xs">REJECTED</div>
          <p className="text-sm">{job.rejection_reason}</p>
        </div>
      )}

      {job.score_breakdown && job.score_breakdown.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-2 text-xs">
            WHY {job.score ?? ""}
          </div>
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {job.score_breakdown.map((entry, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={
                    entry.points >= 0 ? "text-foreground" : "text-destructive"
                  }
                >
                  {entry.points >= 0 ? "+" : ""}
                  {entry.points}
                </span>
                <span className="text-muted-foreground">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft?.todo_notes && draft.todo_notes.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-md border px-3 py-2">
          <WarningIcon
            weight="regular"
            className="text-destructive mt-0.5 shrink-0"
          />
          <div className="text-sm">
            {draft.todo_notes.map((note, i) => (
              <div key={i}>{note}</div>
            ))}
          </div>
        </div>
      )}

      {draft?.cover_letter && (
        <EditableCoverLetter jobId={job.id} coverLetter={draft.cover_letter} />
      )}

      {draft?.screening_answers && draft.screening_answers.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              SCREENING ({draft.screening_answers.length})
            </span>
            <div className="flex gap-2">
              <CopyButton text={answersText} label="Copy all" />
              {draft.cover_letter && <CopyButton text={bothText} label="Copy both" />}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {draft.screening_answers.map((qa, i) => (
              <div key={i} className="text-sm">
                <div className="text-muted-foreground">{qa.question}</div>
                <div>{qa.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-muted-foreground mb-2 text-xs">DESCRIPTION</div>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {stripUntrustedTags(job.description)}
        </p>
      </div>
    </div>
  );
}
