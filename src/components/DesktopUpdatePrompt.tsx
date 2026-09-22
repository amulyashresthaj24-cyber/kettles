"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store-supabase";
import { useNotification } from "@/components/ui/notification";
import {
  checkForDesktopUpdate,
  DESKTOP_UPDATE_CHECK_EVENT,
  DESKTOP_UPDATE_FOUND_EVENT,
  type PendingUpdate,
} from "@/lib/updater";
import { listen } from "@/lib/desktop";

/**
 * Offers a desktop update instead of forcing one.
 *
 * The install terminates the app on Windows NSIS, so it must never interrupt a
 * running session — the previous behaviour made a timer disappear mid-focus
 * with no prompt at all. We hold the update until the session ends, then ask.
 *
 * Renders nothing.
 */
export function DesktopUpdatePrompt() {
  const { notify } = useNotification();
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const [pending, setPending] = useState<PendingUpdate | null>(null);
  const offered = useRef(false);

  const active = sessions.find((s) => s.id === activeSessionId);
  // "finishing" still owns the screen — wait for a real resting state.
  const sessionBusy =
    Boolean(activeSessionId) &&
    (active?.state === "running" || active?.state === "paused" || active?.state === "finishing");

  useEffect(() => {
    let cancelled = false;
    checkForDesktopUpdate().then((update) => {
      if (!cancelled && update) setPending(update);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tray "Check for Updates…" and Settings both ask here. An explicit check
  // must always answer, including when there is nothing to install.
  useEffect(() => {
    let cancelled = false;

    const applyExplicit = async () => {
      const update = await checkForDesktopUpdate();
      if (cancelled) return;
      if (update) {
        offered.current = false;
        setPending(update);
      } else {
        notify({
          title: "You're up to date",
          description: "No newer version is available right now.",
          tone: "success",
        });
      }
    };

    const onWindowCheck = () => {
      void applyExplicit();
    };
    const onUpdateFound = (event: Event) => {
      const update = (event as CustomEvent<PendingUpdate>).detail;
      if (!update) return;
      offered.current = false;
      setPending(update);
    };

    window.addEventListener(DESKTOP_UPDATE_CHECK_EVENT, onWindowCheck);
    window.addEventListener(DESKTOP_UPDATE_FOUND_EVENT, onUpdateFound);

    const unlisten = listen<string>("shortcut-action", async (action) => {
      if (action !== "check_updates" || cancelled) return;
      await applyExplicit();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(DESKTOP_UPDATE_CHECK_EVENT, onWindowCheck);
      window.removeEventListener(DESKTOP_UPDATE_FOUND_EVENT, onUpdateFound);
      unlisten.then((off) => off());
    };
  }, [notify]);

  useEffect(() => {
    if (!pending || sessionBusy || offered.current) return;
    offered.current = true;

    notify({
      title: `Update available — ${pending.version}`,
      description:
        "Installing closes Kettles and reopens it. Your tracked time is already saved.",
      tone: "info",
      // Long enough to read and act on; this is not a passing confirmation.
      durationMs: 15000,
      action: {
        label: "Restart & update",
        onClick: () => {
          notify({
            title: "Installing update…",
            description: "Kettles will close and reopen on its own.",
            tone: "info",
            durationMs: 30000,
          });
          pending.install().catch((err) => {
            offered.current = false;
            notify({
              title: "Update failed",
              description:
                err instanceof Error && err.message
                  ? err.message
                  : "Could not install the update. You can keep working.",
              tone: "error",
            });
          });
        },
      },
    });
  }, [pending, sessionBusy, notify]);

  return null;
}
