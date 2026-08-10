"use client";

import { useCallback, useEffect, useState } from "react";
import { getSyncEngine, type SyncDeadLetter, type SyncStatus } from "@/lib/sync-engine";

/**
 * SyncStatusBadge – compact pill showing offline-sync state.
 * Hidden entirely when online with an empty queue (the common case).
 *
 * `blocked` is the one state that needs the user: those writes exhausted their
 * retries and are parked. The badge must not say they "will retry" — that was
 * the old copy, and it was shown while the operation was actually being dropped.
 */
export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [pending, setPending] = useState(0);
  const [blocked, setBlocked] = useState<SyncDeadLetter[]>([]);

  useEffect(() => {
    return getSyncEngine().subscribe((s, p) => {
      setStatus(s);
      setPending(p);
      setBlocked(getSyncEngine().getDeadLetters());
    });
  }, []);

  const retryAll = useCallback(() => {
    getSyncEngine().retryAllDeadLetters();
    setBlocked(getSyncEngine().getDeadLetters());
  }, []);

  // Nothing to show: online, queue drained, nothing parked.
  if (status === "idle" && pending === 0 && blocked.length === 0) return null;

  const label =
    blocked.length > 0
      ? `${blocked.length} change${blocked.length === 1 ? "" : "s"} not saved`
      : status === "offline"
        ? pending > 0
          ? `Offline · ${pending} queued`
          : "Offline"
        : status === "syncing"
          ? `Syncing… ${pending}`
          : status === "error"
            ? `${pending} pending — retrying`
            : pending > 0
              ? `${pending} queued`
              : "Synced";

  const tone =
    blocked.length > 0
      ? "text-error"
      : status === "syncing"
        ? "text-accent"
        : status === "error"
          ? "text-amber-500"
          : "text-text-muted";

  const dot =
    blocked.length > 0
      ? "bg-error"
      : status === "syncing"
        ? "animate-pulse bg-accent"
        : status === "offline"
          ? "bg-text-muted"
          : status === "error"
            ? "bg-amber-500"
            : "bg-emerald-500";

  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-1 text-[12px] font-medium ${tone}`}
      title={
        blocked.length > 0
          ? blocked.map((d) => `${d.action} ${d.entity}: ${d.lastError}`).join("\n")
          : "Offline sync status"
      }
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      {blocked.length > 0 && (
        <button
          type="button"
          onClick={retryAll}
          className="ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-surface-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}
