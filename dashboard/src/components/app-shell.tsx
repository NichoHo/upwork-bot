"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  ClockCounterClockwiseIcon,
  GearSixIcon,
  PaperPlaneTiltIcon,
  ProhibitIcon,
  SignOutIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

const NAV_LINKS: { href: string; label: string; icon: ComponentType<{ weight?: "regular" | "fill"; className?: string }> }[] = [
  { href: "/", label: "Queue", icon: StackIcon },
  { href: "/sent", label: "Sent", icon: PaperPlaneTiltIcon },
  { href: "/rejected", label: "Rejected", icon: ProhibitIcon },
  { href: "/runs", label: "Runs", icon: ClockCounterClockwiseIcon },
  { href: "/settings", label: "Settings", icon: GearSixIcon },
];

export function AppShell({
  member,
  title,
  actions,
  children,
}: {
  member: Member;
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Proposal Desk</p>
          <p className="text-muted-foreground text-xs">SkyDeck Labs</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon weight={active ? "fill" : "regular"} className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-2 py-2">
          <div className="flex items-center justify-between gap-2 px-1.5 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.display_name}</p>
              <p className="text-muted-foreground font-mono text-xs capitalize">
                {member.upwork_account}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-muted-foreground hover:text-foreground w-full justify-start gap-2.5 px-2.5"
            >
              <SignOutIcon className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {title && (
          <header className="flex items-center justify-between border-b px-6 py-3.5">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {actions}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
