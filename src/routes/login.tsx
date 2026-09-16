import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ component: Login });

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M6.6 14.3 5.5 15.1 3 17.1C4.7 20.5 8.1 22.8 12 22.8c2.7 0 4.9-.9 6.6-2.4l-3.1-2.4c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3z" />
      <path fill="#4A90E2" d="M3 6.9C1.7 9.5 1.7 12.5 3 15.1l3.6-2.8C6 11.1 6 10.9 6 10.8c0-.1 0-.3.1-.5z" />
      <path fill="#FBBC05" d="M12 5.2c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 1.9 14.7.8 12 .8 8.1.8 4.7 3.1 3 6.9l3.6 2.8C7 7 9.3 5.2 12 5.2z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.2 3H21l-6.5 7.4L22 21h-6.2l-4.4-5.8L6 21H3.2l7-8L2 3h6.3l4 5.3L18.2 3zm-1.1 16.2h1.7L7 4.7H5.2l11.9 14.5z"
      />
    </svg>
  );
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "x" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) return <Navigate to="/" />;

  async function onProvider(providerId: string, key: "google" | "x") {
    setError(null);
    setBusy(key);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "up") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim() || email.split("@")[0],
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (signUpError) throw new Error(signUpError.message ?? "Could not create the account");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (signInError) throw new Error(signInError.message ?? "Email or password is not recognised");
      }
      await authClient.getSession();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  const google = GROK_PROVIDERS.find((p) => p.idp === "google");
  const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="relative hidden overflow-hidden bg-primary px-10 py-12 text-primary-fg lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary-fg/5" />
          <div className="absolute -bottom-20 left-10 size-72 rounded-full bg-primary-fg/5" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md bg-primary-fg/15">
                <BookOpen className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-xl leading-none">Arden Stores</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-primary-fg/70">Ridge Campus</p>
              </div>
            </div>
            <h1 className="mt-16 max-w-md font-display text-4xl font-medium leading-tight">
              The campus ledger, for staff only.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-fg/80">
              Sign in with school Gmail, X, or a staff email to open the student register, staff roll, stores, and invoices.
            </p>
          </div>
          <dl className="relative grid max-w-md grid-cols-3 gap-6 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-fg/60">Students</dt>
              <dd className="mt-1 font-display text-lg">Admission no.</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-fg/60">Teachers</dt>
              <dd className="mt-1 font-display text-lg">TSC no.</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-fg/60">Support</dt>
              <dd className="mt-1 font-display text-lg">ID no.</dd>
            </div>
          </dl>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-fg">
                <BookOpen className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-lg leading-none">Arden Stores</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">Staff sign-in</p>
              </div>
            </div>

            <p className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-muted lg:block">Staff access</p>
            <h2 className="font-display text-3xl font-medium tracking-tight">Sign in to the ledger</h2>
            <p className="mt-2 text-sm text-muted">
              School Gmail, Google Workspace, X, or a staff email and password.
            </p>

            {!authEnabled ? (
              <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
            ) : (
              <>
                <div className="mt-8 grid gap-2">
                  {google ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 justify-start gap-3 bg-surface text-base"
                      disabled={busy !== null}
                      onClick={() => onProvider(google.providerId, "google")}
                    >
                      <GoogleMark />
                      {busy === "google" ? "Opening Google…" : "Continue with Google"}
                    </Button>
                  ) : null}
                  {x ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 justify-start gap-3 bg-surface text-base"
                      disabled={busy !== null}
                      onClick={() => onProvider(x.providerId, "x")}
                    >
                      <XMark />
                      {busy === "x" ? "Opening X…" : "Continue with X"}
                    </Button>
                  ) : null}
                </div>

                <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-subtle">
                  <span className="h-px flex-1 bg-border" />
                  or school email
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="mb-4 grid grid-cols-2 rounded-md border border-border bg-surface-2 p-1">
                  <button
                    type="button"
                    className={`h-10 rounded-sm text-sm font-medium ${mode === "in" ? "bg-surface text-fg shadow-soft" : "text-muted"}`}
                    onClick={() => setMode("in")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={`h-10 rounded-sm text-sm font-medium ${mode === "up" ? "bg-surface text-fg shadow-soft" : "text-muted"}`}
                    onClick={() => setMode("up")}
                  >
                    Create account
                  </button>
                </div>

                <form className="grid gap-3" onSubmit={onEmail}>
                  {mode === "up" ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="staff-name">Full name</Label>
                      <Input
                        id="staff-name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jane Wanjiku"
                      />
                    </div>
                  ) : null}
                  <div className="grid gap-1.5">
                    <Label htmlFor="staff-email">Email</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@arden.ac.ke"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="staff-password">Password</Label>
                    <Input
                      id="staff-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete={mode === "up" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  {error ? (
                    <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <Button type="submit" className="mt-1 h-12" disabled={busy !== null}>
                    {busy === "email"
                      ? mode === "up"
                        ? "Creating account…"
                        : "Signing in…"
                      : mode === "up"
                        ? "Create staff account"
                        : "Sign in with email"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
