import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BookOpen,
  Boxes,
  Building2,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Link2,
  Menu,
  UserRound,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/students", label: "Students", icon: Users },
  { to: "/staff", label: "Staff", icon: UserRound },
  { to: "/campus", label: "Campus", icon: Building2 },
  { to: "/inventory", label: "Stores", icon: Boxes },
  { to: "/import", label: "Excel", icon: FileSpreadsheet },
  { to: "/movements", label: "Issues", icon: ArrowLeftRight },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/settings", label: "Link", icon: Link2 },
] as const;

const MOBILE = [
  { to: "/", label: "Home", icon: LayoutGrid },
  { to: "/students", label: "Students", icon: Users },
  { to: "/staff", label: "Staff", icon: UserRound },
  { to: "/inventory", label: "Stores", icon: Boxes },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function AccountFooter() {
  const user = useCurrentUser();
  return (
    <div className="border-t border-border px-3 py-3">
      <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">Signed in</p>
      <div className="rounded-md bg-surface-2 px-2 py-2">
        <UserButton />
        {user?.primaryEmail ? (
          <p className="mt-1 truncate px-1 text-[11px] text-muted">{user.primaryEmail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-fg">
            <BookOpen className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-[17px] leading-none">Arden Stores</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">Ridge Campus</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <AccountFooter />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-fg">
            <BookOpen className="size-3.5" />
          </span>
          <span className="font-display text-base">Arden Stores</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-surface">
          <div className="px-5 py-6">
            <p className="font-display text-lg">Arden Stores</p>
            <p className="text-sm text-muted">Ridge Campus ledger</p>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium",
                  isActive(pathname, item.to) ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 px-2">
            <AccountFooter />
          </div>
        </SheetContent>
      </Sheet>

      <main className="md:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
