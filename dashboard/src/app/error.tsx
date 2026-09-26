"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function QueueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Alert variant="destructive" className="w-full max-w-md">
        <AlertDescription className="flex flex-col gap-3">
          <span>Couldn&apos;t load the queue: {error.message}</span>
          <Button variant="outline" size="sm" onClick={reset} className="self-start">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
