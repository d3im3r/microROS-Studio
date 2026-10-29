"use client";
import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Cpu, LogIn, LogOut, UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { LanguageToggle, useLanguage } from "../language";
import { ThemeSelector, ThemeToggle } from "../theme";
import { signIn, signOut, signUp, useSession } from "./client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

const E2E_REQUIRE_AUTH_KEY = "microros-require-auth";

export function AuthScreen({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { translate } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "signup") {
        const res = await signUp.email({
          name: name.trim() || email.split("@")[0] || "Developer",
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || "Could not create account. Verify your details.");
          setPending(false);
          return;
        }
      } else {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password.");
          setPending(false);
          return;
        }
      }
      try {
        localStorage.removeItem(E2E_REQUIRE_AUTH_KEY);
      } catch {
        /* ignore storage errors */
      }
      onAuthenticated?.();
    } catch {
      setError("Authentication request failed. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setPending(true);
    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (res?.error) {
        setError(res.error.message || "Google sign-in is not configured on this server.");
      }
    } catch {
      setError("Google sign-in is not configured on this server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-secondary dark:text-primary">
            <Cpu size={18} />
          </div>
          <div className="whitespace-nowrap text-base font-semibold tracking-tight">
            {translate("micro")}
            <span className="text-secondary dark:text-primary">{translate("ROS")}</span>{" "}
            <span className="font-normal text-muted-foreground">{translate("Studio")}</span>
          </div>
          <span className="hidden rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground md:inline">
            {translate("BETA 0.3")}
          </span>
          <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
            <span className="hidden text-[10px] text-muted-foreground lg:inline">{translate("created by:")}</span>
            <div aria-label={translate("d3im3r signature")} className="h-8 w-24 shrink-0">
              <Image
                src="/brand/d3im3r/horizontal-light.svg"
                alt={translate("d3im3r")}
                width={96}
                height={32}
                unoptimized
                className="h-8 w-24 dark:hidden"
              />
              <Image
                src="/brand/d3im3r/horizontal-dark.svg"
                alt={translate("d3im3r")}
                width={96}
                height={32}
                unoptimized
                className="hidden h-8 w-24 dark:block"
              />
            </div>
          </div>
        </div>
        <nav aria-label={translate("Preferences and help")} className="flex max-w-full flex-wrap items-center gap-2">
          <LanguageToggle />
          <ThemeSelector />
          <ThemeToggle />
        </nav>
      </header>

      <main className="grid flex-1 place-items-center p-4 sm:p-6">
        <section
          aria-label={translate("Authentication")}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-secondary dark:text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{translate("Access microROS Studio")}</h1>
              <p className="text-xs text-muted-foreground">
                {translate("Sign in to configure, validate and export ESP32 micro-ROS firmware.")}
              </p>
            </div>
          </div>

          <div role="tablist" aria-label={translate("Authentication mode")} className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
                mode === "signin"
                  ? "bg-card text-secondary shadow-sm dark:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn size={14} />
              {translate("Sign in")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
                mode === "signup"
                  ? "bg-card text-secondary shadow-sm dark:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus size={14} />
              {translate("Create account")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <label>
                {translate("Full name")}
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder={translate("ROS Developer")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>
            )}

            <label>
              {translate("Email")}
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="developer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>

            <label>
              {translate("Password")}
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={translate("Minimum 8 characters")}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive bg-destructive/10 p-2.5 text-xs text-destructive">
                {translate(error)}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {mode === "signin" ? <LogIn /> : <UserPlus />}
              {translate(
                pending
                  ? "Authenticating…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"
              )}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{translate("or")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={handleGoogleSignIn}
          >
            {translate("Continue with Google")}
          </Button>
        </section>
      </main>
    </div>
  );
}

export function UserSessionControl({
  user,
  onSignOut,
}: {
  user: AuthUser;
  onSignOut: () => void;
}) {
  const { translate } = useLanguage();
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="hidden max-w-28 truncate text-xs text-muted-foreground xl:inline"
        title={user.email}
      >
        {user.name || user.email}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 shadow-sm"
        aria-label={translate("Sign out")}
        title={`${translate("Sign out")} (${user.email})`}
        onClick={onSignOut}
      >
        <LogOut />
      </Button>
    </div>
  );
}

export function ProtectedStudio({
  e2eDefaultAuth = false,
  children,
}: {
  e2eDefaultAuth?: boolean;
  children: (props: { user: AuthUser; signOutUser: () => Promise<void> }) => ReactNode;
}) {
  const { translate } = useLanguage();
  const { data: session, isPending, refetch } = useSession();
  const [requireAuthInE2E, setRequireAuthInE2E] = useState(() => {
    if (!e2eDefaultAuth) return true;
    try {
      return typeof window !== "undefined" && localStorage.getItem(E2E_REQUIRE_AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!e2eDefaultAuth) return;
    try {
      setRequireAuthInE2E(localStorage.getItem(E2E_REQUIRE_AUTH_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, [e2eDefaultAuth]);

  async function handleSignOut() {
    try {
      localStorage.setItem(E2E_REQUIRE_AUTH_KEY, "1");
    } catch {
      /* ignore */
    }
    setRequireAuthInE2E(true);
    await signOut();
  }

  if (session?.user) {
    return children({
      user: {
        id: session.user.id,
        name: session.user.name || session.user.email,
        email: session.user.email,
      },
      signOutUser: handleSignOut,
    });
  }

  if (e2eDefaultAuth && !requireAuthInE2E) {
    return children({
      user: {
        id: "e2e-user",
        name: "ROS Developer",
        email: "dev@microros.local",
      },
      signOutUser: handleSignOut,
    });
  }

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center text-secondary dark:text-primary">
        {translate("Loading microROS Studio…")}
      </main>
    );
  }

  return (
    <AuthScreen
      onAuthenticated={() => {
        setRequireAuthInE2E(false);
        void refetch();
      }}
    />
  );
}
