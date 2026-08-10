"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KettleLoader } from "@/components/KettleLoader";
import { useApp } from "@/lib/store-supabase";

/**
 * Google sends the user here after the Calendar consent screen.
 *
 * This route lives under /settings on purpose: AppShell's auth guard covers
 * everything that is not /auth, /onboarding or a public page, so an
 * unauthenticated hit is redirected to sign-in rather than reaching the
 * exchange with no session. The edge function also verifies `state` against
 * the caller's user id, so a code cannot be redeemed into someone else's
 * account even if this page were reached some other way.
 */
export default function GoogleCalendarCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const completeConnect = useApp((s) => s.completeGoogleCalendarConnect);
  const [error, setError] = useState<string | null>(null);

  // React 18 StrictMode mounts effects twice in dev. An OAuth code is
  // single-use: the second exchange fails with invalid_grant and would show a
  // spurious error on an otherwise successful connect.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const denied = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    // User pressed "Cancel" on the consent screen. Not an error worth shouting
    // about — send them back to where they started.
    if (denied) {
      router.replace("/settings?googleCalendar=cancelled");
      return;
    }

    if (!code || !state) {
      setError("Google did not return an authorization code. Try connecting again.");
      return;
    }

    void (async () => {
      try {
        await completeConnect(code, state);
        // replace(), not push(): the authorization code is in this URL and
        // should not sit in history where a back-navigation replays it.
        router.replace("/settings?googleCalendar=connected");
      } catch {
        setError("Could not finish connecting Google Calendar. Try again from Settings.");
      }
    })();
  }, [params, router, completeConnect]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-lg p-2xl text-center">
        <div className="flex max-w-[360px] flex-col gap-2">
          <h1 className="text-[18px] font-semibold text-text-primary">
            Google Calendar not connected
          </h1>
          <p className="text-[13px] leading-relaxed text-text-muted">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => router.replace("/settings")}
          className="rounded-lg px-lg py-sm text-[13px] font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <KettleLoader message="Connecting Google Calendar..." />
    </div>
  );
}
