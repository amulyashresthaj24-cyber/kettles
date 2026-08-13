"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { KettleLoader } from "@/components/KettleLoader";

function oauthErrorMessage(error: string, description: string | null): string {
  if (error === "access_denied") return "Google sign-in was cancelled.";
  if (description) return description;
  return "Google sign-in failed. Please try again.";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // React 18 StrictMode remounts effects in dev. The auth code is single-use.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();

        const providerError = searchParams.get("error");
        if (providerError) {
          router.replace(
            "/auth?error=" +
              encodeURIComponent(
                oauthErrorMessage(providerError, searchParams.get("error_description"))
              )
          );
          return;
        }

        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          router.replace("/dashboard");
          return;
        }

        const code = searchParams.get("code");
        if (!code) {
          console.error("No auth code found in URL");
          router.replace("/auth?error=no_auth_code");
          return;
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Auth callback error:", error);
          router.replace("/auth?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data.session) {
          router.replace("/dashboard");
        } else {
          console.warn("Auth callback: No session returned from exchangeCodeForSession");
          router.replace("/auth?error=no_session");
        }
      } catch (err) {
        console.error("Auth callback exception:", err);
        router.replace("/auth?error=authentication_failed");
      }
    };

    void handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-base">
      <KettleLoader message="Signing you in..." />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-base">
        <KettleLoader message="Signing you in..." />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
