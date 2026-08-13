"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getFriendlySupabaseErrorMessage } from "@/lib/supabase";
import {
  CheckCircle,
  Spinner,
  Eye,
  EyeSlash,
} from "@/components/ui/icon";
import { BrandMark } from "@/components/BrandMark";
import { KettleLoader } from "@/components/KettleLoader";

/** Official multicolour G mark — brand logo, not Phosphor. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Prefill email / surface OAuth callback errors from query string.
  // Read from window to avoid the useSearchParams Suspense requirement.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get("email");
    if (handoff) setEmail(handoff);
    const callbackError = params.get("error");
    if (callbackError) {
      // Callback may pass a short code or a provider error message.
      const decoded = decodeURIComponent(callbackError);
      setError(
        decoded === "no_auth_code" ||
        decoded === "no_session" ||
        decoded === "authentication_failed"
          ? "Google sign-in failed. Please try again."
          : decoded
      );
    }
  }, []);

  // Redirect if already logged in (same destination as email sign-in / OAuth callback)
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    if (mode === "signup" && !name) {
      setError("Name is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const { requiresEmailConfirmation } = await signUp(email, password, { name });

        if (requiresEmailConfirmation) {
          setSuccess(true);
        } else {
          // Signup successful without email confirmation, go to onboarding
          router.push("/onboarding");
        }
      } else {
        await signIn(email, password);
        // Signin successful, go to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getFriendlySupabaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Browser redirects to Google; keep spinner until unload.
    } catch (err) {
      setError(getFriendlySupabaseErrorMessage(err));
      setIsGoogleSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setEmailError("");
    setPasswordError("");
    setEmail("");
    setPassword("");
    setName("");
    setSuccess(false);
  };

  const formBusy = isSubmitting || isGoogleSubmitting;

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <KettleLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base">
      {/* Left Brand Panel - Desktop Only */}
      <section className="relative hidden w-[40%] overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--card-gradient-start)_0%,var(--card-gradient-mid)_50%,var(--card-gradient-end)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.15),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_80%,rgba(59,130,246,0.1),transparent_35%)]" />
        
        <div className="relative z-10 flex w-full flex-col justify-between px-4xl py-5xl">
          {/* Logo */}
          <div className="flex items-center gap-lg">
            <BrandMark size="lg" />
          </div>

          {/* Center Content */}
          <div className="space-y-4xl">
            {/* Divider */}
            <div className="h-px bg-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))]" />

            {/* Headline & Subtitle */}
            <div className="space-y-2xl">
              <h1 className="max-w-[380px] font-sans text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
                Task-linked time tracking for focused work
              </h1>
              <p className="max-w-[380px] font-sans text-[18px] leading-[1.5] text-text-muted">
                Track time effortlessly. Stay organized. Ship faster.
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))]" />

            {/* Checklist */}
            <div className="flex flex-col gap-lg">
              {[
                "Connect time to specific tasks",
                "Visualize productivity patterns",
                "Bill accurately with confidence",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-md">
                  <CheckCircle size={20} className="shrink-0 text-accent" aria-hidden />
                  <span className="font-sans text-[15px] font-medium text-text-secondary">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Spacer */}
          <div />
        </div>
      </section>

      {/* Right Auth Panel */}
      <main className="flex w-full flex-col items-center justify-center lg:w-[60%]">
        <div className="w-full max-w-[480px] px-lg py-4xl sm:px-2xl">
          {/* Mobile Brand Header */}
          <div className="mb-4xl flex items-center gap-md lg:hidden">
            <BrandMark size="md" />
          </div>

          {/* Header */}
          <div className="mb-3xl space-y-xs">
            <h2 className="font-sans text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-text-primary">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="font-sans text-[15px] leading-[1.5] text-text-muted">
              {mode === "signin" 
                ? "Sign in to your Kettles account" 
                : "Start tracking your time today"}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="space-y-xl">
              <div className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,var(--border-subtle))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_8%,transparent),color-mix(in_srgb,var(--accent)_4%,transparent))]">
                <div className="flex gap-md p-lg">
                  <CheckCircle size={20} className="shrink-0 text-accent" aria-hidden />
                  <div className="flex flex-col gap-sm">
                    <p className="font-sans text-[14px] font-semibold text-text-primary">
                      Account created successfully
                    </p>
                    <p className="font-sans text-[13px] leading-[1.5] text-text-muted">
                      Email confirmation is enabled. Check your inbox for a confirmation link.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={toggleMode}
                className="w-full rounded-lg bg-accent px-lg py-md font-sans text-[14px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover active:scale-95"
              >
                Sign in with your email
              </button>
            </div>
          ) : (
            <div className="space-y-lg">
              {/* Error Message */}
              {error && (
                <div className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--error)_25%,transparent)] bg-[color-mix(in_srgb,var(--error)_8%,transparent)] px-lg py-md">
                  <p className="font-sans text-[13px] leading-[1.5] text-status-error">
                    {error}
                  </p>
                </div>
              )}

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={formBusy}
                className="flex h-12 w-full items-center justify-center gap-md rounded-lg border border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid font-sans text-[15px] font-semibold text-text-primary transition-all duration-150 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border-subtle))] hover:bg-surface-raised active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={16} weight="regular" className="animate-spin" aria-hidden />
                    Redirecting to Google...
                  </span>
                ) : (
                  <>
                    <GoogleMark />
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-md">
                <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--accent)_12%,var(--border-subtle))]" />
                <span className="font-sans text-[12px] font-medium uppercase tracking-[0.04em] text-text-faint">
                  or
                </span>
                <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--accent)_12%,var(--border-subtle))]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-lg">
                {/* Name Field (Signup Only) */}
                {mode === "signup" && (
                  <div className="space-y-sm">
                    <label htmlFor="name" className="font-sans text-[13px] font-medium text-text-secondary">
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      disabled={formBusy}
                      className="h-12 w-full rounded-lg border border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid px-md font-sans text-[15px] text-text-primary transition-colors duration-150 placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-sm">
                  <label htmlFor="email" className="font-sans text-[13px] font-medium text-text-secondary">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="you@example.com"
                    disabled={formBusy}
                    autoFocus
                    className={`h-12 w-full rounded-lg border px-md font-sans text-[15px] text-text-primary transition-colors duration-150 placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${
                      emailError
                        ? "border-status-error bg-[color-mix(in_srgb,var(--error)_5%,transparent)] focus:border-status-error"
                        : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid focus:border-accent"
                    }`}
                  />
                  {emailError && (
                    <p className="font-sans text-[12px] text-status-error">{emailError}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-sm">
                  <label htmlFor="password" className="font-sans text-[13px] font-medium text-text-secondary">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="••••••••"
                      disabled={formBusy}
                      className={`h-12 w-full rounded-lg border px-md pr-12 font-sans text-[15px] text-text-primary transition-colors duration-150 placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${
                        passwordError
                          ? "border-status-error bg-[color-mix(in_srgb,var(--error)_5%,transparent)] focus:border-status-error"
                          : "border-[color-mix(in_srgb,var(--accent)_10%,var(--border-subtle))] bg-surface-mid focus:border-accent"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={formBusy}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeSlash size={20} aria-hidden />
                      ) : (
                        <Eye size={20} aria-hidden />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="font-sans text-[12px] text-status-error">{passwordError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={formBusy}
                  className="mt-xl h-12 w-full rounded-lg bg-accent font-sans text-[15px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size={16} weight="regular" className="animate-spin" aria-hidden />
                      {mode === "signin" ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : mode === "signin" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Toggle Mode */}
          {!success && (
            <div className="pt-lg text-center">
              <p className="font-sans text-[13px] text-text-muted">
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={formBusy}
                  className="font-semibold text-accent transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          )}

          {/* Legal Text — links reserved until published legal pages exist */}
          <div className="mt-4xl pt-lg text-center">
            <p className="font-sans text-[12px] leading-[1.5] text-text-faint">
              By continuing, you agree to our{" "}
              <a href="/legal/terms" className="text-text-muted transition-colors hover:text-text-secondary">
                Terms of Service
              </a>
              {" "}and{" "}
              <a href="/legal/privacy" className="text-text-muted transition-colors hover:text-text-secondary">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
