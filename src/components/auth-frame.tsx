import { useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/app-shell";
import { touchSession } from "@/lib/school/queries";

type SessionHint = { id: string; email: string | null } | null;

export function AuthFrame({
  children,
  sessionHint,
}: {
  children: ReactNode;
  sessionHint: SessionHint;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const signedIn = Boolean(user) || (isPending && Boolean(sessionHint));

  useEffect(() => {
    if (!user) return;
    void touchSession().catch(() => undefined);
  }, [user]);

  if (pathname === "/login") return <>{children}</>;

  if (isPending && !sessionHint) {
    return <SessionSplash />;
  }

  if (!signedIn) return <RedirectToSignIn />;

  return <AppShell>{children}</AppShell>;
}

function SessionSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-fg">
      <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-fg">
        <BookOpen className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 font-display text-2xl">Arden Stores</p>
      <p className="mt-1 text-sm text-muted">Checking your staff session…</p>
    </div>
  );
}
