"use client";

import { useState } from "react";
import { updateSetting } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex flex-1 flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Last updated {new Date(updatedAt).toLocaleString()}
          {savedAt && ` · saved at ${savedAt}`}
        </p>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[70vh] flex-1 font-mono text-xs"
        spellCheck={false}
      />
      <p className="text-muted-foreground text-xs">
        The hunter reads this fresh from the database before every run, so a save here takes
        effect on the next hourly run. No restart needed.
      </p>
    </div>
  );
}
