"use client";

import { useState } from "react";
import { updateCoverLetter } from "@/app/actions/jobs";
import { CopyButton } from "@/components/queue/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function EditableCoverLetter({
  jobId,
  coverLetter,
}: {
  jobId: string;
  coverLetter: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(coverLetter);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateCoverLetter(jobId, value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">COVER LETTER</span>
        <div className="flex gap-2">
          <CopyButton text={editing ? value : coverLetter} label="Copy" />
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue(coverLetter);
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>
      {editing ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="text-sm"
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{coverLetter}</p>
      )}
    </div>
  );
}
