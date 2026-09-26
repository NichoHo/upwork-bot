import { notFound } from "next/navigation";
import { requireMember } from "@/app/actions/auth";
import { getSetting } from "@/lib/settings";
import { AppHeader } from "@/components/app-header";
import { SettingsEditor } from "@/components/settings/settings-editor";

export default async function SettingsPage() {
  const member = await requireMember();
  const profile = await getSetting("profile");
  if (!profile) notFound();

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <AppHeader member={member} />
      <SettingsEditor settingKey="profile" initialValue={profile.value} updatedAt={profile.updatedAt} />
    </main>
  );
}
