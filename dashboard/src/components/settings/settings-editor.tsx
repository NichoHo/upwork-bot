"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { updateSetting } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MARKDOWN_COMPONENTS: Components = {
  h1: (props) => <h1 className="mt-6 text-lg font-semibold tracking-tight first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 text-base font-semibold tracking-tight first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-4 text-sm font-semibold tracking-tight" {...props} />,
  p: (props) => <p className="my-2 text-sm leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  hr: () => <hr className="my-6 border-border" />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-2" {...props} />,
  code: (props) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props} />,
  pre: (props) => <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs" {...props} />,
  table: (props) => <Table {...props} />,
  thead: (props) => <TableHeader {...props} />,
  tbody: (props) => <TableBody {...props} />,
  tr: (props) => <TableRow {...props} />,
  th: (props) => <TableHead {...props} />,
  td: (props) => <TableCell {...props} />,
};

export function SettingsEditor({
  settingKey,
  initialValue,
  updatedAt,
}: {
  settingKey: string;
  initialValue: string;
  updatedAt: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = value !== initialValue;

  async function save() {
    setSaving(true);
    try {
      await updateSetting(settingKey, value);
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-6 pt-6 pb-3">
        <p className="text-muted-foreground text-xs">
          Last updated {new Date(updatedAt).toLocaleString()}
          {savedAt && ` · saved at ${savedAt}`}
        </p>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setMode(mode === "edit" ? "view" : "edit")}>
            {mode === "edit" ? "Preview" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="px-6 pt-3 pb-6">
        {mode === "view" ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {value}
          </ReactMarkdown>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full font-mono text-xs"
            spellCheck={false}
          />
        )}

        <p className="text-muted-foreground mt-3 text-xs">
          The hunter reads this fresh from the database before every run, so a save here takes
          effect on the next hourly run. No restart needed.
        </p>
      </div>
    </div>
  );
}
