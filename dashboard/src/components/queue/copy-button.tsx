"use client";

import { useState } from "react";
import { CopyIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon data-icon="inline-start" weight="regular" />
      ) : (
        <CopyIcon data-icon="inline-start" weight="regular" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
