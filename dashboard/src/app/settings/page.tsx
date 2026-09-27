import { notFound } from "next/navigation";
import { requireMember } from "@/app/actions/auth";
import { getSetting } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";
import { SettingsEditor } from "@/components/settings/settings-editor";

export default async function SettingsPage() {
  const member = await requireMember();
  const profile = await getSetting("profile");
  if (!profile) notFound();

  return (
    <AppShell member={member} title="Settings">
      <SettingsEditor settingKey="profile" initialValue={profile.value} updatedAt={profile.updatedAt} />
    </AppShell>
  );
}
