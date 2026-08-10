"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store-supabase";
import { useNotification } from "@/components/ui/notification";

/**
 * Surfaces store failures that no caller reports.
 *
 * The store declared an `error` field that ~25 mutations wrote to and nothing
 * ever read, so a failed session start, stop, discard, or manual time entry
 * looked exactly like success. Mutations that throw now leave the message to
 * their caller; whatever is left reaches here.
 *
 * Renders nothing — mounted once inside NotificationProvider.
 */
export function StoreErrorBridge() {
  const error = useApp((s) => s.error);
  const clearError = useApp((s) => s.clearError);
  const { notify } = useNotification();

  useEffect(() => {
    if (!error) return;
    notify({
      title: "Something didn't save",
      description: error,
      tone: "error",
      durationMs: 6000,
    });
    // Clear so an identical message later still fires — the selector only
    // reacts to a changed value.
    clearError();
  }, [error, clearError, notify]);

  return null;
}
