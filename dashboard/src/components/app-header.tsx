"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

const NAV_LINKS = [
  { href: "/", label: "Queue" },
  { href: "/sent", label: "Sent" },
  { href: "/rejected", label: "Rejected" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ member }: { member: Member }) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-sm font-medium">Proposal Desk</h1>
          <p className="text-muted-foreground font-mono text-xs">
            {member.display_name} &middot; {member.upwork_account}
          </p>
        </div>
        <nav className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm",
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
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
  );
}
