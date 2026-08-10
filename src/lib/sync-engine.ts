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

export type SyncEntity = "clients" | "projects" | "tasks" | "sessions";

export type SyncOperation = {
  id: string;
  entity: SyncEntity;
  action: "create" | "update" | "delete";
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
};

/**
 * The server assigned a different id than the one created locally.
 *
 * Local ids come from `uid()`, which is not a UUID, and the edge functions build
 * their insert without an `id` so Postgres always mints its own. Every reference
 * to the local id — queued operations, foreign keys in queued payloads, and
 * every array and selection in the store — has to be rewritten, or the local row
 * survives alongside the remote one and the same hours are billed twice.
 */
export interface IdRemap {
  entity: SyncEntity;
  localId: string;
  remoteId: string;
}

/**
 * An operation that exhausted its retries. Kept rather than dropped: these are
 * writes the user made that never reached the server, and deleting them silently
 * is how time logs disappear.
 */
export interface SyncDeadLetter extends SyncOperation {
  failedAt: number;
  lastError: string;
}

/** `blocked` means there is at least one dead letter awaiting a decision. */
export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "blocked";

type SyncListener = (status: SyncStatus, pending: number) => void;
type IdRemapListener = (remap: IdRemap) => void;
type EntityApi = {
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

/**
 * Which payload fields point at which entity.
 *
 * Read as: when a `clients` id is remapped, rewrite `clientId` on any queued
 * `projects` payload. Sessions are a leaf — nothing references them.
 */
const FOREIGN_KEYS: Record<SyncEntity, Partial<Record<SyncEntity, string[]>>> = {
  clients: { projects: ["clientId"] },
  projects: { tasks: ["projectId"], sessions: ["projectId"] },
  tasks: { sessions: ["taskId"] },
  sessions: {},
};

const MAX_RETRIES = 5;

/**
 * Dependency depth. A child must not be sent before its parent has a real
 * server id, or the edge function silently drops the unresolvable foreign key
 * and commits an orphan — a session with `task_id = null` that no later remap
 * can repair, because its queue entry is already gone.
 */
const ENTITY_DEPTH: Record<SyncEntity, number> = {
  clients: 0,
  projects: 1,
  tasks: 2,
  sessions: 3,
};

/** Parents first for writes, children first for deletes. */
function executionOrder(a: SyncOperation, b: SyncOperation): number {
  const depth = (op: SyncOperation) =>
    op.action === "delete" ? -ENTITY_DEPTH[op.entity] : ENTITY_DEPTH[op.entity];
  const byDepth = depth(a) - depth(b);
  return byDepth !== 0 ? byDepth : a.timestamp - b.timestamp;
}

/** Pull the server-assigned id out of a create response, if there is one. */
function readId(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const id = (response as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY = "flowmate-sync-queue";
const DEAD_LETTER_KEY = "flowmate-sync-dead-letters";
/**
 * Which account the persisted queue belongs to.
 *
 * The engine is a module singleton that outlives sign-out, and nothing clears it
 * there. Without an owner, user A's queued writes replay against user B's token
 * on the next sign-in. Storing the owner lets the queue be parked instead of
 * either replayed or destroyed — both of which are wrong.
 */
const QUEUE_OWNER_KEY = "flowmate-sync-owner";

// ---------------------------------------------------------------------------
// Queue implementation
// ---------------------------------------------------------------------------

class SyncEngine {
  private queue: SyncOperation[] = [];
  private deadLetters: SyncDeadLetter[] = [];
  private owner: string | null = null;
  private status: SyncStatus = "idle";
  private listeners: SyncListener[] = [];
  private remapListeners: IdRemapListener[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor() {
    this.loadQueue();
    this.loadDeadLetters();
    this.loadOwner();
    this.status = this.idleStatus();

    // Listen for connectivity changes
    onConnectionChange((online) => {
      if (online) {
        this.status = this.idleStatus();
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

    // Replay anything left from the previous run (edits were otherwise lost
    // until the first 3-minute tick or a reconnect event).
    if (isOnline() && this.queue.length > 0) {
      void this.flush();
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Enqueue a mutation. If online, flush immediately.
   *
   * Collapsing rules. The queue must never hold an operation that cannot
   * execute against the server:
   *
   * - `update` over a pending `create` → fold the patch into the create. The
   *   row does not exist remotely yet, so replaying it as an update would 404,
   *   burn five retries and get dropped, losing the entity entirely.
   * - `update` over a pending `update` → keep only the newest.
   * - `create` over anything → replace; a fresh create supersedes.
   * - `delete` over a pending `create` → cancel both; the server never saw it.
   */
  enqueue(op: Omit<SyncOperation, "id" | "timestamp" | "retries">): void {
    const isSameEntity = (q: SyncOperation) =>
      q.entity === op.entity && q.entityId === op.entityId;
    const pendingCreate = this.queue.find((q) => isSameEntity(q) && q.action === "create");

    if (op.action === "update" && pendingCreate) {
      // Fold the patch in so the row lands complete in a single round trip.
      pendingCreate.payload = { ...pendingCreate.payload, ...op.payload };
      pendingCreate.timestamp = Date.now();
      this.queue = this.queue.filter((q) => !(isSameEntity(q) && q.action === "update"));
      this.saveQueue();
      this.notify();
      if (isOnline()) this.flush();
      return;
    }

    if (op.action === "delete" && pendingCreate) {
      // Created and deleted while offline — drop the whole chain.
      this.queue = this.queue.filter((q) => !isSameEntity(q));
      this.saveQueue();
      this.notify();
      return;
    }

    // Keep only the latest create/update per entity so older queued edits
    // cannot overwrite a newer one after restart.
    if (op.action === "create" || op.action === "update") {
      this.queue = this.queue.filter(
        (q) => !(isSameEntity(q) && (q.action === "create" || q.action === "update"))
      );
    }

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
  getPendingDeletes(entity: SyncEntity): Set<string> {
    const ids = new Set<string>();
    for (const op of this.queue) {
      if (op.entity === entity && op.action === "delete") {
        ids.add(op.entityId);
      }
    }
    return ids;
  }

  /**
   * Latest pending create/update payload per entity id. Used when merging
   * remote lists so in-flight edits are not overwritten by stale server rows.
   */
  getPendingUpdates(entity: SyncEntity): Map<string, Record<string, unknown>> {
    const map = new Map<string, Record<string, unknown>>();
    for (const op of this.queue) {
      if (op.entity === entity && (op.action === "create" || op.action === "update")) {
        map.set(op.entityId, op.payload);
      }
    }
    return map;
  }

  /**
   * Declare which account owns the queue. Call on sign-in and on sign-out.
   *
   * Switching to a different account parks the previous owner's work rather than
   * replaying it under the new token (cross-account corruption) or deleting it
   * (silent loss of the user's writes). Parked operations become dead letters,
   * so they stay visible and recoverable.
   */
  setOwner(account: string | null | undefined): void {
    const next = account?.trim().toLowerCase() || null;
    const current = this.owner;
    if (current === next) return;

    this.owner = next;
    this.persistOwner();

    // Signing out (next === null) keeps the queue for when the same account
    // returns. Only a genuinely different account parks it.
    if (current && next && this.queue.length > 0) {
      const failedAt = Date.now();
      this.deadLetters = [
        ...this.deadLetters,
        ...this.queue.map((op) => ({
          ...op,
          failedAt,
          lastError: `Queued while signed in as ${current}; not sent under a different account`,
        })),
      ];
      this.queue = [];
      this.saveQueue();
      this.saveDeadLetters();
      this.status = this.idleStatus();
      this.notify();
    }
  }

  /** Account the persisted queue belongs to, or null when signed out. */
  getOwner(): string | null {
    return this.owner;
  }

  /**
   * Subscribe to server-assigned id changes. Returns unsubscribe function.
   *
   * The store must handle every one of these — an unhandled remap leaves a
   * duplicate row and dangling foreign keys in Zustand.
   */
  subscribeIdRemaps(listener: IdRemapListener): () => void {
    this.remapListeners.push(listener);
    return () => {
      this.remapListeners = this.remapListeners.filter((l) => l !== listener);
    };
  }

  /** Operations that exhausted their retries and are awaiting a user decision. */
  getDeadLetters(): SyncDeadLetter[] {
    return [...this.deadLetters];
  }

  /** Move a dead letter back onto the active queue with its retry count reset. */
  retryDeadLetter(id: string): void {
    if (!this.requeueDeadLetter(id)) return;
    this.status = this.idleStatus();
    this.notify();
    if (isOnline()) this.flush();
  }

  /** Requeue without flushing. Returns false when the id is unknown. */
  private requeueDeadLetter(id: string): boolean {
    const entry = this.deadLetters.find((d) => d.id === id);
    if (!entry) return false;
    const { failedAt: _failedAt, lastError: _lastError, ...op } = entry;

    // Queue first, then drop the dead letter. The reverse order loses the write
    // entirely if the second write hits the storage quota.
    this.queue.push({ ...op, retries: 0 });
    this.saveQueue();
    this.deadLetters = this.deadLetters.filter((d) => d.id !== id);
    this.saveDeadLetters();
    return true;
  }

  /** Abandon a dead letter. The write is gone — only the user may decide that. */
  discardDeadLetter(id: string): void {
    this.deadLetters = this.deadLetters.filter((d) => d.id !== id);
    this.saveDeadLetters();
    this.status = this.idleStatus();
    this.notify();
  }

  /**
   * Move every dead letter back onto the queue, then flush once.
   *
   * Requeueing one at a time and flushing per entry only retried the first —
   * the rest hit the `isSyncing` guard and sat until the next 3-minute tick.
   */
  retryAllDeadLetters(): void {
    let requeued = false;
    for (const entry of this.getDeadLetters()) {
      requeued = this.requeueDeadLetter(entry.id) || requeued;
    }
    if (!requeued) return;
    this.status = this.idleStatus();
    this.notify();
    if (isOnline()) this.flush();
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

    // Parents before children. Queue insertion order usually gets this right,
    // but a retried dead letter, a replaced create, or a legacy persisted queue
    // does not, and the endpoints fail open rather than rejecting.
    const batch = [...this.queue].sort(executionOrder);
    const failed: SyncOperation[] = [];
    const newDeadLetters: SyncDeadLetter[] = [];
    const remaps: IdRemap[] = [];
    /** Local ids whose create failed this batch — their children must wait. */
    const unresolved = new Set<string>();

    for (const op of batch) {
      // Holding a child back is not a failure: it keeps its retry count and its
      // place in the queue, and goes out once the parent has a real id.
      if (this.dependsOnUnresolved(op, unresolved)) {
        failed.push(op);
        continue;
      }
      try {
        const remap = await this.executeOperation(op);
        // Remove from queue on success
        this.queue = this.queue.filter((q) => q.id !== op.id);
        if (remap) {
          // Apply immediately so the very next operation in this batch — which
          // may reference the local id — executes against the real one. The
          // queued operations are shared objects, so `batch` sees this too.
          this.applyIdRemapToQueue(remap);
          remaps.push(remap);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[SyncEngine] Failed to sync operation ${op.id}:`, error);
        op.retries += 1;
        if (op.retries < MAX_RETRIES) {
          failed.push(op);
        } else {
          // Never silently dropped. A write the user made is either on the
          // server or visible to them as blocked.
          console.error(
            `[SyncEngine] Operation ${op.id} moved to dead letters after ${MAX_RETRIES} retries`
          );
          newDeadLetters.push({ ...op, failedAt: Date.now(), lastError: message });
        }
        // Whether retried or parked, this entity has no server id yet.
        if (op.action === "create") unresolved.add(op.entityId);
      }
    }

    // Update queue with any failed operations
    this.queue = [...this.queue.filter((q) => !batch.some((b) => b.id === q.id)), ...failed];
    this.saveQueue();

    if (newDeadLetters.length > 0) {
      this.deadLetters = [...this.deadLetters, ...newDeadLetters];
      this.saveDeadLetters();
    }

    this.isSyncing = false;
    this.status =
      this.deadLetters.length > 0 ? "blocked" : this.queue.length > 0 ? "error" : "idle";
    this.notify();

    // Notified last so the store rewrites its ids against a settled queue.
    for (const remap of remaps) {
      this.remapListeners.forEach((l) => l(remap));
    }
  }

  /**
   * Discard everything. Destroys unsynced writes, so this is not the sign-out
   * path — use `setOwner()` there. Kept for tests and explicit user action.
   */
  clear(): void {
    this.queue = [];
    this.deadLetters = [];
    this.owner = null;
    this.saveQueue();
    this.saveDeadLetters();
    this.persistOwner();
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

  /** Returns a remap when the server minted an id different from the local one. */
  private async executeOperation(op: SyncOperation): Promise<IdRemap | null> {
    // Dynamically import the API to avoid circular dependencies
    const { api } = await import("./supabase");

    const entityApi = api[op.entity] as EntityApi | undefined;
    if (!entityApi) throw new Error(`Unknown entity: ${op.entity}`);

    switch (op.action) {
      case "create": {
        // Never send the local id. `taskUpdatePayload()` spreads the whole task
        // — id included — and `enqueue()` folds that into the pending create, so
        // a create payload can carry a `uid()` the server must not see.
        const { id: _localId, ...createPayload } = op.payload;
        // The response was previously discarded, which is what let the local id
        // and the server id both survive as separate rows.
        const created = await entityApi.create(createPayload);
        const remoteId = readId(created);
        if (!remoteId) {
          throw new Error(`Create for ${op.entity}/${op.entityId} returned no id`);
        }
        return remoteId === op.entityId
          ? null
          : { entity: op.entity, localId: op.entityId, remoteId };
      }
      case "update":
        await entityApi.update(op.entityId, op.payload);
        return null;
      case "delete":
        await entityApi.delete(op.entityId);
        return null;
      default:
        throw new Error(`Unknown action: ${op.action}`);
    }
  }

  /**
   * Rewrite every reference to `localId` still sitting in the queue.
   *
   * Mutates the operations in place rather than replacing them, because
   * `flush()` holds a shallow copy of the queue and must observe the new ids for
   * the remainder of the batch.
   */
  applyIdRemapToQueue(remap: IdRemap): void {
    const fields = FOREIGN_KEYS[remap.entity];
    const rewrite = (op: SyncOperation) => {
      if (op.entity === remap.entity && op.entityId === remap.localId) {
        op.entityId = remap.remoteId;
      }
      for (const field of fields[op.entity] ?? []) {
        if (op.payload[field] === remap.localId) {
          op.payload = { ...op.payload, [field]: remap.remoteId };
        }
      }
    };
    this.queue.forEach(rewrite);
    // Dead letters too. Retrying a parked project can succeed and remap its id;
    // a parked session still holding the old local `projectId` would then fail
    // forever or commit as an orphan.
    this.deadLetters.forEach(rewrite);
    this.saveQueue();
    this.saveDeadLetters();
  }

  /** True when this operation still points at a parent that has no server id. */
  private dependsOnUnresolved(op: SyncOperation, unresolved: Set<string>): boolean {
    if (unresolved.size === 0) return false;
    if (op.entity !== "sessions" && op.entityId && unresolved.has(op.entityId)) return true;
    for (const parent of Object.keys(FOREIGN_KEYS) as SyncEntity[]) {
      for (const field of FOREIGN_KEYS[parent][op.entity] ?? []) {
        const value = op.payload[field];
        if (typeof value === "string" && unresolved.has(value)) return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Dead letters
  // -------------------------------------------------------------------------

  private loadDeadLetters(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DEAD_LETTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.deadLetters = parsed;
      }
    } catch {
      this.deadLetters = [];
    }
  }

  private saveDeadLetters(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(this.deadLetters));
    } catch {
      // Storage full or unavailable
    }
  }

  private loadOwner(): void {
    if (typeof window === "undefined") return;
    try {
      this.owner = localStorage.getItem(QUEUE_OWNER_KEY);
    } catch {
      this.owner = null;
    }
  }

  private persistOwner(): void {
    if (typeof window === "undefined") return;
    try {
      if (this.owner) localStorage.setItem(QUEUE_OWNER_KEY, this.owner);
      else localStorage.removeItem(QUEUE_OWNER_KEY);
    } catch {
      // Storage full or unavailable
    }
  }

  private idleStatus(): SyncStatus {
    if (!isOnline()) return "offline";
    return this.deadLetters.length > 0 ? "blocked" : "idle";
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
