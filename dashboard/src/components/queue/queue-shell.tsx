"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { markSubmitted, skipJob } from "@/app/actions/jobs";
import { formatAge, formatBudget } from "@/lib/format";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STATE_BORDER: Record<Job["status"], string> = {
  shortlisted: "border-l-primary",
  rejected: "border-l-transparent",
  applied: "border-l-emerald-500",
  expired: "border-l-transparent",
};
const EDITED_BORDER = "border-l-amber-500";

export function QueueShell({
  jobs,
  selectedId,
  editedJobIds,
  coverLetter,
  answersText,
  children,
}: {
  jobs: Job[];
  selectedId: string | null;
  editedJobIds: string[];
  coverLetter: string | null;
  answersText: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const select = useCallback(
    (id: string | null) => router.push(id ? `/?job=${id}` : "/", { scroll: false }),
    [router],
  );

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1200);
  }, []);

  const advancePast = useCallback(
    (jobId: string) => {
      const index = jobs.findIndex((j) => j.id === jobId);
      const remaining = jobs.filter((j) => j.id !== jobId);
      select(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
      router.refresh();
    },
    [jobs, select, router],
  );

  const doMarkSubmitted = useCallback(
    async (jobId: string) => {
      setPending(true);
      try {
        await markSubmitted(jobId);
        flash("Marked submitted");
        advancePast(jobId);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Failed to mark submitted");
      } finally {
        setPending(false);
      }
    },
    [advancePast, flash],
  );

  const doSkip = useCallback(
    async (jobId: string, reason: string) => {
      setPending(true);
      try {
        await skipJob(jobId, reason);
        flash("Skipped");
        advancePast(jobId);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Failed to skip");
      } finally {
        setPending(false);
      }
    },
    [advancePast, flash],
  );

  const promptAndSkip = useCallback(
    (jobId: string) => {
      const reason = window.prompt("Skip reason:");
      if (reason && reason.trim()) doSkip(jobId, reason.trim());
    },
    [doSkip],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        return;
      }
      const index = jobs.findIndex((j) => j.id === selectedId);
      const selected = index >= 0 ? jobs[index] : null;

      switch (e.key) {
        case "j": {
          const next = jobs[Math.min(jobs.length - 1, index + 1)];
          if (next) select(next.id);
          break;
        }
        case "k": {
          const prev = jobs[Math.max(0, index - 1)];
          if (prev) select(prev.id);
          break;
        }
        case "Enter":
          if (selected) window.open(selected.url, "_blank", "noreferrer");
          break;
        case "c":
          if (coverLetter) {
            navigator.clipboard.writeText(coverLetter);
            flash("Copied cover letter");
          }
          break;
        case "a":
          if (answersText) {
            navigator.clipboard.writeText(answersText);
            flash("Copied screening answers");
          }
          break;
        case "s":
          if (selected && !pending) doMarkSubmitted(selected.id);
          break;
        case "x":
          if (selected && !pending) promptAndSkip(selected.id);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jobs, selectedId, coverLetter, answersText, select, flash, pending, doMarkSubmitted, promptAndSkip]);

  return (
    <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
      <div className="flex flex-col overflow-y-auto border-r">
        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => select(job.id)}
            className={cn(
              "hover:bg-accent focus-visible:ring-ring flex flex-col gap-0.5 border-b border-l-[3px] px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset",
              editedJobIds.includes(job.id) ? EDITED_BORDER : STATE_BORDER[job.status],
              job.id === selectedId && "bg-accent",
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-medium">
                {job.score ?? "-"}
              </span>
              <span className="truncate text-sm">{job.title}</span>
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              {formatBudget(job)} &middot; {job.proposals_tier ?? "?"} &middot;{" "}
              {formatAge(job.published_at)}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-y-auto">
        {children}
        {selectedId && (
          <div className="flex items-center gap-2 border-t p-4">
            <Button size="sm" disabled={pending} onClick={() => doMarkSubmitted(selectedId)}>
              Mark as submitted
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => promptAndSkip(selectedId)}
            >
              Skip, reason
            </Button>
          </div>
        )}
      </div>

      {toast && (
        <div className="bg-foreground text-background fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md px-3 py-1.5 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
