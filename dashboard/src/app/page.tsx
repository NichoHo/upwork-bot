import { requireMember, signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default async function QueuePage() {
  const member = await requireMember();

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-sm font-medium">Proposal Desk</h1>
          <p className="text-muted-foreground font-mono text-xs">
            {member.display_name} · {member.upwork_account}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">
          Nothing here yet. The queue lands in Phase 2.
        </p>
      </div>
    </main>
  );
}
