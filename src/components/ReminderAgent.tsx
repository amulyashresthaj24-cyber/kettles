"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store-supabase";
import { isDesktop } from "@/lib/desktop";
import { petSignal } from "@/lib/pet";
import { useNotification } from "@/components/ui/notification";

/**
 * ReminderAgent — fires the scheduled reminders managed on /reminders.
 *
 * Runs on every surface: on desktop the reminder is delivered through the pet
 * mascot (speech bubble + native notification); on the web it falls back to a
 * browser notification plus an in-app toast. Renders nothing.
 *
 * Interval-based break reminders stay in DesktopShell — they are coupled to
 * the live focus session loop there.
 */
export function ReminderAgent() {
  const { notify } = useNotification();
  const lastFiredMinuteRef = useRef<string>("");

  useEffect(() => {
    const check = () => {
      const prefs = useApp.getState().preferences;
      if (!prefs?.petCustomRemindersEnabled) return;
      const reminders = prefs.petCustomReminders;
      if (!reminders || reminders.length === 0) return;

      const nowDate = new Date();
      const currentMinute = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;
      if (currentMinute === lastFiredMinuteRef.current) return;

      const today = nowDate.getDay();
      const due = reminders.filter(
        (r) =>
          r.active &&
          r.time === currentMinute &&
          (!r.days || r.days.length === 0 || r.days.includes(today))
      );
      if (due.length === 0) return;
      lastFiredMinuteRef.current = currentMinute;

      for (const rem of due) {
        if (isDesktop()) {
          petSignal({
            event: "hover",
            quote: rem.text,
            quoteKind: "reminder",
            notify: { title: "Reminder", body: rem.text },
          });
        } else {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Reminder", { body: rem.text });
          }
          notify({ title: "Reminder", description: rem.text, tone: "info" });
        }
      }
    };

    check();
    const intervalId = window.setInterval(check, 5000);
    return () => window.clearInterval(intervalId);
  }, [notify]);

  return null;
}
