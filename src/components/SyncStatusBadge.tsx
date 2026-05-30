"use client";

import { useEffect, useState } from "react";
import { getSyncEngine, type SyncStatus } from "@/lib/sync-engine";

/**
 * SyncStatusBadge – compact pill showing offline-sync state.
 * Hidden entirely when online with an empty queue (the common case).
 */
export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    return getSyncEngine().subscribe((s, p) => {
      setStatus(s);
      setPending(p);
    });
  }, []);

  // Nothing to show: online and queue drained.
  if (status === "idle" && pending === 0) return null;

  const label =
    status === "offline"
      ? pending > 0
        ? `Offline · ${pending} queued`
        : "Offline"
      : status === "syncing"
        ? `Syncing… ${pending}`
        : status === "error"
          ? `${pending} pending — will retry`
          : pending > 0
            ? `${pending} queued`
            : "Synced";

  const tone =
    status === "syncing"
      ? "text-accent"
      : status === "error"
        ? "text-amber-500"
        : "text-text-muted";

  const dot =
    status === "syncing"
      ? "animate-pulse bg-accent"
      : status === "offline"
        ? "bg-text-muted"
        : status === "error"
          ? "bg-amber-500"
          : "bg-emerald-500";

  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-1 text-[12px] font-medium ${tone}`}
      title="Offline sync status"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
