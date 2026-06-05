"use client";

/**
 * Offline-first sync engine for Flowmate.
 *
 * Queues local mutations when offline and replays them against Supabase
 * when connection is restored. Also handles periodic background sync.
 */

import { isOnline, onConnectionChange } from "./desktop";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncOperation = {
  id: string;
  entity: "clients" | "projects" | "tasks" | "sessions";
  action: "create" | "update" | "delete";
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
};

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type SyncListener = (status: SyncStatus, pending: number) => void;
type EntityApi = {
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "flowmate-sync-queue";

// ---------------------------------------------------------------------------
// Queue implementation
// ---------------------------------------------------------------------------

class SyncEngine {
  private queue: SyncOperation[] = [];
  private status: SyncStatus = "idle";
  private listeners: SyncListener[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor() {
    this.loadQueue();
    this.status = isOnline() ? "idle" : "offline";

    // Listen for connectivity changes
    onConnectionChange((online) => {
      if (online) {
        this.status = this.queue.length > 0 ? "idle" : "idle";
        this.notify();
        // Flush the queue when coming back online
        this.flush();
      } else {
        this.status = "offline";
        this.notify();
      }
    });

    // Start periodic sync (every 3 minutes)
    this.syncTimer = setInterval(() => {
      if (isOnline() && this.queue.length > 0) {
        this.flush();
      }
    }, 3 * 60 * 1000);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Enqueue a mutation. If online, flush immediately. */
  enqueue(op: Omit<SyncOperation, "id" | "timestamp" | "retries">): void {
    const entry: SyncOperation = {
      ...op,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      retries: 0,
    };
    this.queue.push(entry);
    this.saveQueue();
    this.notify();

    // Attempt immediate flush if online
    if (isOnline()) {
      this.flush();
    }
  }

  /** Get current sync status. */
  getStatus(): SyncStatus {
    return this.status;
  }

  /** Get number of pending operations. */
  getPendingCount(): number {
    return this.queue.length;
  }

  /** Get a set of entity IDs that are pending deletion. */
  getPendingDeletes(entity: "clients" | "projects" | "tasks" | "sessions"): Set<string> {
    const ids = new Set<string>();
    for (const op of this.queue) {
      if (op.entity === entity && op.action === "delete") {
        ids.add(op.entityId);
      }
    }
    return ids;
  }

  /** Subscribe to sync status changes. Returns unsubscribe function. */
  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    // Immediately notify with current state
    listener(this.status, this.queue.length);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Manually trigger a sync flush. */
  async flush(): Promise<void> {
    if (this.isSyncing || !isOnline() || this.queue.length === 0) return;

    this.isSyncing = true;
    this.status = "syncing";
    this.notify();

    const batch = [...this.queue];
    const failed: SyncOperation[] = [];

    for (const op of batch) {
      try {
        await this.executeOperation(op);
        // Remove from queue on success
        this.queue = this.queue.filter((q) => q.id !== op.id);
      } catch (error) {
        console.warn(`[SyncEngine] Failed to sync operation ${op.id}:`, error);
        op.retries += 1;
        if (op.retries < 5) {
          failed.push(op);
        } else {
          console.error(`[SyncEngine] Dropping operation ${op.id} after 5 retries`);
        }
      }
    }

    // Update queue with any failed operations
    this.queue = [...this.queue.filter((q) => !batch.some((b) => b.id === q.id)), ...failed];
    this.saveQueue();

    this.isSyncing = false;
    this.status = this.queue.length > 0 ? "error" : "idle";
    this.notify();
  }

  /** Clear the entire queue (e.g., on sign out). */
  clear(): void {
    this.queue = [];
    this.saveQueue();
    this.status = "idle";
    this.notify();
  }

  /** Destroy the sync engine (cleanup). */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.listeners = [];
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async executeOperation(op: SyncOperation): Promise<void> {
    // Dynamically import the API to avoid circular dependencies
    const { api } = await import("./supabase");

    const entityApi = api[op.entity] as EntityApi | undefined;
    if (!entityApi) throw new Error(`Unknown entity: ${op.entity}`);

    switch (op.action) {
      case "create":
        await entityApi.create(op.payload);
        break;
      case "update":
        await entityApi.update(op.entityId, op.payload);
        break;
      case "delete":
        await entityApi.delete(op.entityId);
        break;
      default:
        throw new Error(`Unknown action: ${op.action}`);
    }
  }

  private loadQueue(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.status, this.queue.length));
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _engine: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
  if (!_engine) {
    _engine = new SyncEngine();
  }
  return _engine;
}
