"use client";

import { useEffect, useRef } from "react";
import { getSyncEngine, type SyncStatus } from "@/lib/sync-engine";
import { useNotification } from "@/components/ui/notification";

/**
 * Confirms recovery after an offline stretch.
 *
 * SyncStatusBadge shows the queue draining, but when it finished the badge just
 * disappeared — the user never got a positive signal that the work they did
 * offline actually reached the server. Silence is the same shape as failure.
 *
 * Renders nothing.
 */
export function SyncReconnectNotifier() {
  const { notify } = useNotification();
  // What we owed the server the last time we were not idle. Read at the moment
  // the queue drains, since by then `pending` is already 0.
  const owed = useRef(0);
  const wasDisconnected = useRef(false);

  useEffect(() => {
    return getSyncEngine().subscribe((status: SyncStatus, pending: number) => {
      if (pending > 0) owed.current = pending;
      if (status === "offline" || status === "error") {
        wasDisconnected.current = true;
        return;
      }

      // idle + nothing queued, after having been disconnected with work owed.
      if (status === "idle" && pending === 0 && wasDisconnected.current) {
        const count = owed.current;
        wasDisconnected.current = false;
        owed.current = 0;

        const blocked = getSyncEngine().getDeadLetters();
        if (blocked.length > 0) {
          // Do not claim success while writes are parked — the badge offers Retry.
          return;
        }
        if (count === 0) return;

        notify({
          title: "Back online",
          description: `${count} change${count === 1 ? "" : "s"} synced.`,
          tone: "success",
        });
      }
    });
  }, [notify]);

  return null;
}
