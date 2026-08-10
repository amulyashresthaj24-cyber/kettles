import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The engine imports ./desktop for connectivity and lazily imports ./supabase
// inside executeOperation. Both are stubbed so the queue logic can be tested
// without a browser, a Tauri host, or a network.
let online = false;
vi.mock("./desktop", () => ({
  isOnline: () => online,
  onConnectionChange: () => {},
}));

/**
 * Fake edge API. `create` returns a server id that differs from the local one,
 * which is exactly what production does — the edge functions insert without an
 * `id` so Postgres mints its own.
 */
type ApiCall = { entity: string; action: string; id?: string; payload?: unknown };
const calls: ApiCall[] = [];
let createdIdFor: (entity: string) => string = (e) => `remote-${e}`;
let failEntities = new Set<string>();

function entityApi(entity: string) {
  return {
    create: async (payload: Record<string, unknown>) => {
      calls.push({ entity, action: "create", payload });
      if (failEntities.has(entity)) throw new Error(`boom ${entity}`);
      return { id: createdIdFor(entity) };
    },
    update: async (id: string, payload: Record<string, unknown>) => {
      calls.push({ entity, action: "update", id, payload });
      if (failEntities.has(entity)) throw new Error(`boom ${entity}`);
      return { id };
    },
    delete: async (id: string) => {
      calls.push({ entity, action: "delete", id });
      if (failEntities.has(entity)) throw new Error(`boom ${entity}`);
      return { success: true };
    },
  };
}

vi.mock("./supabase", () => ({
  api: {
    clients: entityApi("clients"),
    projects: entityApi("projects"),
    tasks: entityApi("tasks"),
    sessions: entityApi("sessions"),
  },
}));

import { getSyncEngine, type IdRemap, type SyncOperation } from "./sync-engine";

/** Reach into the singleton's private queue — the collapse rules are the unit. */
function queueOf(engine: ReturnType<typeof getSyncEngine>): SyncOperation[] {
  return (engine as unknown as { queue: SyncOperation[] }).queue;
}

describe("SyncEngine.enqueue collapsing", () => {
  let engine: ReturnType<typeof getSyncEngine>;

  beforeEach(() => {
    online = false; // stay queued so nothing flushes mid-assertion
    engine = getSyncEngine();
    engine.clear();
  });

  it("folds an update into a pending create instead of dropping the create", () => {
    // The regression: offline create then edit used to delete the create and
    // leave an update against an id the server has never seen. That update
    // 404s, burns five retries, and the entity is lost with no user-facing error.
    engine.enqueue({
      entity: "sessions",
      action: "create",
      entityId: "local-1",
      payload: { taskId: "t1", durationSeconds: 0 },
    });
    engine.enqueue({
      entity: "sessions",
      action: "update",
      entityId: "local-1",
      payload: { durationSeconds: 1800 },
    });

    const queue = queueOf(engine);
    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe("create");
    expect(queue[0].payload).toEqual({ taskId: "t1", durationSeconds: 1800 });
  });

  it("folds repeated updates into the same pending create", () => {
    engine.enqueue({
      entity: "tasks",
      action: "create",
      entityId: "local-2",
      payload: { title: "Draft", status: "todo" },
    });
    engine.enqueue({
      entity: "tasks",
      action: "update",
      entityId: "local-2",
      payload: { title: "Renamed" },
    });
    engine.enqueue({
      entity: "tasks",
      action: "update",
      entityId: "local-2",
      payload: { status: "doing" },
    });

    const queue = queueOf(engine);
    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe("create");
    expect(queue[0].payload).toEqual({ title: "Renamed", status: "doing" });
  });

  it("cancels the whole chain when a pending create is deleted", () => {
    engine.enqueue({
      entity: "projects",
      action: "create",
      entityId: "local-3",
      payload: { name: "Scratch" },
    });
    engine.enqueue({
      entity: "projects",
      action: "update",
      entityId: "local-3",
      payload: { name: "Scratch 2" },
    });
    engine.enqueue({
      entity: "projects",
      action: "delete",
      entityId: "local-3",
      payload: {},
    });

    // Never reached the server, so replaying a delete would just 404.
    expect(queueOf(engine)).toHaveLength(0);
  });

  it("still collapses update-over-update when there is no pending create", () => {
    engine.enqueue({
      entity: "clients",
      action: "update",
      entityId: "remote-1",
      payload: { name: "A" },
    });
    engine.enqueue({
      entity: "clients",
      action: "update",
      entityId: "remote-1",
      payload: { name: "B" },
    });

    const queue = queueOf(engine);
    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe("update");
    expect(queue[0].payload).toEqual({ name: "B" });
  });

  it("keeps a delete for an entity that already exists remotely", () => {
    engine.enqueue({
      entity: "clients",
      action: "update",
      entityId: "remote-2",
      payload: { name: "A" },
    });
    engine.enqueue({
      entity: "clients",
      action: "delete",
      entityId: "remote-2",
      payload: {},
    });

    const queue = queueOf(engine);
    expect(queue.map((q) => q.action)).toEqual(["update", "delete"]);
  });

  it("does not collapse across different entities or ids", () => {
    engine.enqueue({ entity: "tasks", action: "create", entityId: "x", payload: { a: 1 } });
    engine.enqueue({ entity: "sessions", action: "update", entityId: "x", payload: { b: 2 } });
    engine.enqueue({ entity: "tasks", action: "update", entityId: "y", payload: { c: 3 } });

    expect(queueOf(engine)).toHaveLength(3);
  });
});

// ─── Id remapping ────────────────────────────────────────────────────────────

describe("SyncEngine id remapping", () => {
  let engine: ReturnType<typeof getSyncEngine>;
  let remaps: IdRemap[];
  let unsubscribe: () => void;

  beforeEach(() => {
    online = false;
    calls.length = 0;
    failEntities = new Set();
    createdIdFor = (e) => `remote-${e}`;
    engine = getSyncEngine();
    engine.clear();
    remaps = [];
    unsubscribe = engine.subscribeIdRemaps((r) => remaps.push(r));
  });

  afterEach(() => unsubscribe());

  it("reports the server id when it differs from the local one", async () => {
    // The whole defect: this response used to be discarded, so the local row and
    // the remote row both survived as duplicate billable time.
    engine.enqueue({ entity: "sessions", action: "create", entityId: "local-s", payload: {} });
    online = true;
    await engine.flush();

    expect(remaps).toEqual([
      { entity: "sessions", localId: "local-s", remoteId: "remote-sessions" },
    ]);
  });

  it("reports nothing when the server echoes the id back", async () => {
    createdIdFor = () => "local-s";
    engine.enqueue({ entity: "sessions", action: "create", entityId: "local-s", payload: {} });
    online = true;
    await engine.flush();

    expect(remaps).toEqual([]);
  });

  it("fails the operation when a create returns no id", async () => {
    createdIdFor = () => "";
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: {} });
    online = true;
    await engine.flush();

    // Retried rather than silently treated as success.
    expect(queueOf(engine)).toHaveLength(1);
    expect(queueOf(engine)[0].retries).toBe(1);
  });

  it("rewrites a queued update so it targets the server id", async () => {
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });
    // Separate enqueue after a flush would collapse; simulate a later edit by
    // pushing the update once the create is already mid-batch.
    const queue = queueOf(engine);
    queue.push({
      id: "op-2",
      entity: "tasks",
      action: "update",
      entityId: "local-t",
      payload: { title: "B" },
      timestamp: Date.now(),
      retries: 0,
    });

    online = true;
    await engine.flush();

    const update = calls.find((c) => c.entity === "tasks" && c.action === "update");
    expect(update?.id).toBe("remote-tasks");
  });

  it("rewrites foreign keys in queued payloads", async () => {
    engine.enqueue({ entity: "projects", action: "create", entityId: "local-p", payload: { name: "P" } });
    const queue = queueOf(engine);
    queue.push({
      id: "op-task",
      entity: "tasks",
      action: "create",
      entityId: "local-t",
      payload: { title: "T", projectId: "local-p" },
      timestamp: Date.now(),
      retries: 0,
    });
    queue.push({
      id: "op-session",
      entity: "sessions",
      action: "create",
      entityId: "local-s",
      payload: { projectId: "local-p", taskId: "local-t" },
      timestamp: Date.now(),
      retries: 0,
    });

    online = true;
    await engine.flush();

    const taskCreate = calls.find((c) => c.entity === "tasks" && c.action === "create");
    expect((taskCreate?.payload as Record<string, unknown>).projectId).toBe("remote-projects");

    // The task's own remap must reach the session queued behind it.
    const sessionCreate = calls.find((c) => c.entity === "sessions" && c.action === "create");
    expect((sessionCreate?.payload as Record<string, unknown>).projectId).toBe("remote-projects");
    expect((sessionCreate?.payload as Record<string, unknown>).taskId).toBe("remote-tasks");
  });

  it("rewrites clientId on a queued project", async () => {
    engine.enqueue({ entity: "clients", action: "create", entityId: "local-c", payload: { name: "C" } });
    queueOf(engine).push({
      id: "op-proj",
      entity: "projects",
      action: "create",
      entityId: "local-p",
      payload: { name: "P", clientId: "local-c" },
      timestamp: Date.now(),
      retries: 0,
    });

    online = true;
    await engine.flush();

    const projectCreate = calls.find((c) => c.entity === "projects" && c.action === "create");
    expect((projectCreate?.payload as Record<string, unknown>).clientId).toBe("remote-clients");
  });
});

// ─── Dependency ordering ─────────────────────────────────────────────────────

describe("SyncEngine execution ordering", () => {
  let engine: ReturnType<typeof getSyncEngine>;

  beforeEach(() => {
    online = false;
    calls.length = 0;
    failEntities = new Set();
    createdIdFor = (e) => `remote-${e}`;
    engine = getSyncEngine();
    engine.clear();
  });

  it("sends parents before children even when queued in the wrong order", async () => {
    // A retried dead letter or a replaced create can land a child ahead of its
    // parent. The endpoints fail open: an unresolvable projectId is silently
    // dropped and the row commits as an orphan.
    engine.enqueue({
      entity: "sessions",
      action: "create",
      entityId: "local-s",
      payload: { projectId: "local-p" },
    });
    engine.enqueue({ entity: "projects", action: "create", entityId: "local-p", payload: { name: "P" } });

    online = true;
    await engine.flush();

    const order = calls.filter((c) => c.action === "create").map((c) => c.entity);
    expect(order).toEqual(["projects", "sessions"]);
    const sessionCreate = calls.find((c) => c.entity === "sessions" && c.action === "create");
    expect((sessionCreate?.payload as Record<string, unknown>).projectId).toBe("remote-projects");
  });

  it("holds a child back when its parent create fails", async () => {
    failEntities = new Set(["projects"]);
    engine.enqueue({ entity: "projects", action: "create", entityId: "local-p", payload: { name: "P" } });
    engine.enqueue({
      entity: "sessions",
      action: "create",
      entityId: "local-s",
      payload: { projectId: "local-p" },
    });

    online = true;
    await engine.flush();

    // The session must not commit as an orphan with a null project.
    expect(calls.some((c) => c.entity === "sessions")).toBe(false);
    expect(queueOf(engine)).toHaveLength(2);
    // Held back, not failed — its retry budget is untouched.
    const session = queueOf(engine).find((q) => q.entity === "sessions");
    expect(session?.retries).toBe(0);
  });

  it("strips a local id from a create payload", async () => {
    // taskUpdatePayload() spreads the whole task, id included, and enqueue folds
    // that into the pending create.
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });
    engine.enqueue({ entity: "tasks", action: "update", entityId: "local-t", payload: { id: "local-t", title: "B" } });

    online = true;
    await engine.flush();

    const create = calls.find((c) => c.entity === "tasks" && c.action === "create");
    expect(create?.payload).toEqual({ title: "B" });
  });
});

// ─── Account ownership ───────────────────────────────────────────────────────

describe("SyncEngine account ownership", () => {
  let engine: ReturnType<typeof getSyncEngine>;

  beforeEach(() => {
    online = false;
    calls.length = 0;
    failEntities = new Set();
    engine = getSyncEngine();
    engine.clear();
  });

  it("parks a previous account's queue instead of replaying it", async () => {
    engine.setOwner("a@example.com");
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });

    engine.setOwner("b@example.com");

    expect(queueOf(engine)).toHaveLength(0);
    const dead = engine.getDeadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0].lastError).toContain("a@example.com");

    // Nothing is sent under the new token.
    online = true;
    await engine.flush();
    expect(calls).toHaveLength(0);
  });

  it("keeps the queue across a sign-out and back in as the same account", async () => {
    engine.setOwner("a@example.com");
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });

    engine.setOwner(null);
    engine.setOwner("a@example.com");

    expect(queueOf(engine)).toHaveLength(1);
    expect(engine.getDeadLetters()).toHaveLength(0);
  });
});

// ─── Dead letters ────────────────────────────────────────────────────────────

describe("SyncEngine dead letters", () => {
  let engine: ReturnType<typeof getSyncEngine>;

  beforeEach(() => {
    online = false;
    calls.length = 0;
    createdIdFor = (e) => `remote-${e}`;
    failEntities = new Set(["tasks"]);
    engine = getSyncEngine();
    engine.clear();
  });

  it("parks an operation after five failures instead of dropping it", async () => {
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });
    online = true;

    for (let i = 0; i < 5; i++) await engine.flush();

    expect(queueOf(engine)).toHaveLength(0);
    const dead = engine.getDeadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0].entityId).toBe("local-t");
    expect(dead[0].lastError).toContain("boom tasks");
    expect(engine.getStatus()).toBe("blocked");
  });

  it("returns a dead letter to the queue with its retries reset", async () => {
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });
    online = true;
    for (let i = 0; i < 5; i++) await engine.flush();

    // Stop failing, then retry: it should drain. Go offline first so
    // `retryDeadLetter` does not kick off its own unawaited flush, which would
    // make the awaited one below a no-op on the `isSyncing` guard.
    failEntities = new Set();
    online = false;
    const [dead] = engine.getDeadLetters();
    engine.retryDeadLetter(dead.id);
    expect(queueOf(engine)[0].retries).toBe(0);

    online = true;
    await engine.flush();

    expect(engine.getDeadLetters()).toHaveLength(0);
    expect(queueOf(engine)).toHaveLength(0);
    expect(engine.getStatus()).toBe("idle");
  });

  it("discards a dead letter only on request", async () => {
    engine.enqueue({ entity: "tasks", action: "create", entityId: "local-t", payload: { title: "A" } });
    online = true;
    for (let i = 0; i < 5; i++) await engine.flush();

    const [dead] = engine.getDeadLetters();
    engine.discardDeadLetter(dead.id);
    expect(engine.getDeadLetters()).toHaveLength(0);
    expect(engine.getStatus()).toBe("idle");
  });
});
