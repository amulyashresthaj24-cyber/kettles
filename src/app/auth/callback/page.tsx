"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { Spinner } from "@/components/ui/icon";

export default function AuthCallbackPage() {
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
      <div className="flex flex-col items-center gap-4">
        <Spinner size={24} weight="regular" className="animate-spin text-text-muted" aria-hidden />
        <p className="text-[14px] text-text-muted">Confirming your email...</p>
      </div>
    </div>
  );
}
