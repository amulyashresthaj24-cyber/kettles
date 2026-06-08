"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { KettleLoader } from "@/components/KettleLoader";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();

        // Get the code from URL params - Supabase sends it as ?code=...
        const code = searchParams.get("code");

        if (!code) {
          console.error("No auth code found in URL");
          router.push("/auth?error=no_auth_code");
          return;
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/auth?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data.session) {
          // Session established successfully
          router.push("/dashboard");
        } else {
          // No session despite successful exchange
          console.warn("Auth callback: No session returned from exchangeCodeForSession");
          router.push("/auth");
        }
      } catch (err) {
        console.error("Auth callback exception:", err);
        router.push("/auth?error=authentication_failed");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-base">
      <KettleLoader message="Confirming your email..." />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-base">
        <KettleLoader message="Confirming your email..." />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
