"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store-supabase";
import { formatDuration } from "@/lib/format";
import { idleGapSeconds } from "@/lib/session-timeline";
import type { IdleRecoveryAction } from "@/lib/types";

/**
 * In-app resolution for an unresolved idle gap.
 *
 * The pet asks first, but it only exists in mini mode and its bubble is
 * transient. This is the surface that guarantees a gap is never silently
 * abandoned: it persists until the user answers, survives a restart (the
 * pending recovery is derived from the sessions themselves on rehydrate), and
 * offers exactly the same four answers.
 *
 * Renders nothing when there is no gap to resolve, which is almost always.
 */
export function IdleRecoveryCard() {
  const sessionId = useApp((s) => s.pendingIdleRecoverySessionId);
  const session = useApp((s) => s.sessions.find((x) => x.id === s.pendingIdleRecoverySessionId));
  const resolveIdleRecovery = useApp((s) => s.resolveIdleRecovery);
  const isLoading = useApp((s) => s.isLoading);

  const [confirmation, setConfirmation] = useState<string | null>(null);
  const recovery = session?.pendingIdleRecovery;

  // While the gap is still open its length keeps growing, so a value read once
  // at render would understate it for as long as the card sits there. Ticks
  // only when there is an unresolved gap and no recorded return.
  const isOpen = !!recovery && recovery.status === "pending" && !recovery.returnedAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [isOpen]);

  // Briefly state what the answer did before the card goes away. The user just
  // edited billable time; they should see the resulting number, not a blank.
  if (!sessionId || !recovery || recovery.status !== "pending") {
    if (!confirmation) return null;
    return (
      <p
        className="rounded-xl border p-md text-[13px] text-text-muted"
        style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
        role="status"
      >
        {confirmation}
      </p>
    );
  }

  const gapSeconds = idleGapSeconds(recovery, now);
  const pausedAt = new Date(recovery.idleStartedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const actions: Array<{ label: string; hint: string; action: IdleRecoveryAction }> = [
    { label: "Trim idle", hint: "Idle time is not billed", action: "resume_trimmed" },
    { label: "Count as work", hint: "You were working away from the keyboard", action: "count_as_work" },
    { label: "Save as draft", hint: "Log the gap separately to classify later", action: "save_as_draft" },
    { label: "Finish there", hint: `End the session at ${pausedAt}`, action: "finish_at_idle" },
  ];

  return (
    <section
      className="rounded-xl border p-lg"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
      aria-label="Unresolved idle time"
    >
      <h2 className="text-[15px] font-semibold text-text-primary">
        {formatDuration(gapSeconds)} unaccounted for
      </h2>
      {/* Factual, not accusatory. The user may have been in a meeting. */}
      <p className="mt-1 text-[13px] text-text-muted">
        The timer paused at {pausedAt} when your input stopped. What should happen to that time?
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map(({ label, hint, action }) => (
          <button
            key={action}
            type="button"
            disabled={isLoading}
            title={hint}
            onClick={() => {
              void resolveIdleRecovery(action).then((summary) => {
                if (summary) setConfirmation(summary);
              });
            }}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
