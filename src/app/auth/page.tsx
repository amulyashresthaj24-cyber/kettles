"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getFriendlySupabaseErrorMessage } from "@/lib/supabase";
import {
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, { name });
        setSuccess(true);
        setTimeout(() => {
          setMode("signin");
          setSuccess(false);
          setPassword("");
        }, 2000);
      } else {
        await signIn(email, password);
        router.push("/");
      }
    } catch (err) {
      setError(getFriendlySupabaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base">
      <section className="relative hidden overflow-hidden bg-surface p-3xl lg:flex lg:w-[45%] lg:items-center lg:justify-center xl:w-[40%]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--accent-dim),transparent_34%)]" />
        
        <div className="relative z-10 w-full max-w-[520px]">
          <KettlesBrandCard />
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center p-2xl lg:p-6xl">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-3xl flex items-center gap-md lg:hidden">
            <BrandMark size="md" />
          </div>

          <div className="space-y-2xl">
            <div className="space-y-1">
              <h2 className="font-sans text-[24px] font-semibold leading-[1.4] tracking-[-0.01em] text-text-primary">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h2>
              <p className="font-sans text-[14px] font-medium leading-[1.4] tracking-[0.02em] text-text-muted">
                {mode === "signin" 
                  ? "Welcome back to Kettles" 
                  : "Start tracking your time today"}
              </p>
            </div>

            {success ? (
              <div className="animate-fade-up overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--accent)_34%,var(--border-subtle))] bg-[linear-gradient(180deg,var(--surface)_0%,var(--card-gradient-mid)_100%)]">
                <div className="flex items-start gap-md p-lg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div className="flex flex-col gap-xs">
                    <p className="font-sans text-[14px] font-semibold leading-[1.4] tracking-[0.02em] text-text-primary">
                      Account created
                    </p>
                    <p className="font-sans text-[13px] leading-[1.5] text-text-muted">
                      Sign in to finish onboarding, create your first project, and start a focus session.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))]">
                  {["Profile", "Project", "Timer"].map((item) => (
                    <div key={item} className="px-md py-sm text-center text-[11px] font-medium text-text-secondary">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-lg">
                {error && (
                  <div className="animate-shake rounded-xl border border-[color-mix(in_srgb,var(--error)_20%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] px-lg py-md">
                    <p className="font-sans text-[13px] leading-[1.5] text-status-error">{error}</p>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="font-sans text-[13px] font-medium leading-[1.4] tracking-[0.02em] text-text-secondary">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-11 w-full rounded-md border border-border-subtle bg-surface-mid px-lg font-sans text-[16px] leading-[1.5] tracking-[0.01em] text-text-primary transition-colors duration-[120ms] ease-out placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="font-sans text-[13px] font-medium leading-[1.4] tracking-[0.02em] text-text-secondary">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus={mode === "signin"}
                    className="h-11 w-full rounded-md border border-border-subtle bg-surface-mid px-lg font-sans text-[16px] leading-[1.5] tracking-[0.01em] text-text-primary transition-colors duration-[120ms] ease-out placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="font-sans text-[13px] font-medium leading-[1.4] tracking-[0.02em] text-text-secondary">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-11 w-full rounded-md border border-border-subtle bg-surface-mid px-lg font-sans text-[16px] leading-[1.5] tracking-[0.01em] text-text-primary transition-colors duration-[120ms] ease-out placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-interactive h-11 w-full rounded-full bg-accent font-sans text-[14px] font-medium leading-[1.4] tracking-[0.02em] text-text-primary hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "signin" ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : mode === "signin" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </button>
              </form>
            )}

            <div className="pt-sm text-center">
              <p className="font-sans text-[13px] leading-[1.5] text-text-muted">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-medium text-accent transition-colors duration-[120ms] hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>

          <div className="mt-5xl text-center">
            <p className="font-sans text-[12px] font-medium leading-[1.4] tracking-[0.02em] text-text-faint">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .animate-shake {
          animation: shake 300ms var(--ease-in);
        }
      `}</style>
    </div>
  );
}

function KettlesBrandCard() {
  const features = [
    "Connect time to specific tasks",
    "Visualize productivity patterns",
    "Bill accurately with confidence",
  ];

  return (
    <div
      className={[
        "min-h-[720px] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))]",
        "bg-[linear-gradient(180deg,var(--card-gradient-start)_0%,var(--card-gradient-mid)_58%,var(--card-gradient-end)_100%)]",
        "p-4xl",
        "flex flex-col justify-center",
      ].join(" ")}
    >
      <div className="flex items-center gap-lg">
        <BrandMark size="lg" />
      </div>

      <div className="my-5xl h-px bg-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))]" />

      <div className="space-y-2xl">
        <h1 className="max-w-[420px] font-sans text-[44px] font-semibold leading-[1.14] tracking-[-0.015em] text-text-primary">
          Task-linked time tracking for focused work
        </h1>
        <p className="max-w-[410px] font-sans text-[18px] leading-[1.5] text-text-muted">
          Track time effortlessly. Stay organized. Ship faster.
        </p>
      </div>

      <div className="my-5xl h-px bg-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))]" />

      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-md">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-md text-[15px] font-semibold text-text-secondary">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
