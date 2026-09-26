"use client";

import { useState, useTransition } from "react";
import { updateOutcomeStatus } from "@/app/actions/outcomes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OutcomeStatus } from "@/lib/types";

const STEPS: Exclude<OutcomeStatus, "waiting">[] = ["replied", "interviewing", "won", "lost"];

export function OutcomeStatusButtons({
  jobId,
  status,
}: {
  jobId: string;
  status: OutcomeStatus;
}) {
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1">
      {STEPS.map((step) => (
        <Button
          key={step}
          size="sm"
          variant={current === step ? "default" : "outline"}
          disabled={pending}
          className={cn("h-6 px-2 text-xs capitalize")}
          onClick={() =>
            startTransition(async () => {
              await updateOutcomeStatus(jobId, step);
              setCurrent(step);
            })
          }
        >
          {step}
        </Button>
      ))}
    </div>
  );
}
