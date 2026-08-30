/**
 * Session lifecycle tests for the Zustand store.
 *
 * The store is where the timer's money math actually lives, and it had no test
 * coverage — a resume path that double-counted paused time shipped undetected.
 * The edge API, connectivity, and the sync queue are stubbed so the lifecycle
 * can be driven without a browser, a Tauri host, or a network.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIMELINE_VERSION, elapsedSecondsFor } from "./session-timeline";
import { uid } from "./format";
import type { Session } from "./types";

// ─── Stubs ───────────────────────────────────────────────────────────────────

let online = true;

// zustand's persist middleware wants a Storage; node has none. An in-memory one
// keeps the middleware quiet and exercises the same write path.
const memStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => void memStore.set(k, v),
  removeItem: (k: string) => void memStore.delete(k),
  clear: () => memStore.clear(),
  key: (i: number) => Array.from(memStore.keys())[i] ?? null,
  get length() {
    return memStore.size;
  },
});

vi.mock("./desktop", () => ({
  isOnline: () => online,
  onConnectionChange: () => () => {},
  isDesktop: () => false,
  invoke: async () => undefined,
  listen: async () => () => {},
  notify: async () => undefined,
  setTrayTitle: async () => undefined,
}));

type Queued = { entity: string; action: string; entityId: string; payload: Record<string, unknown> };
const queued: Queued[] = [];

vi.mock("./sync-engine", () => ({
  getSyncEngine: () => ({
    enqueue: (op: Queued) => queued.push(op),
    getPendingUpdates: () => new Map(),
    getPendingCreates: () => new Map(),
    getPendingDeletes: () => new Set(),
    getStatus: () => ({ pending: 0, deadLetters: 0, syncing: false }),
    subscribe: () => () => {},
    flush: async () => {},
  }),
}));

/**
 * Fake edge API. `create` mints a 36-char id like Postgres does, so the store's
 * remote-vs-local id check sees what it would see in production.
 */
const REMOTE_ID = "11111111-2222-3333-4444-555555555555";
let apiCalls: Array<{ method: string; id?: string; payload?: unknown }> = [];

vi.mock("./supabase", () => ({
  GoogleCalendarReconnectError: class extends Error {},
  getAppOrigin: () => "http://localhost:3000",
  api: {
    sessions: {
      create: async (payload: Record<string, unknown>) => {
        apiCalls.push({ method: "create", payload });
        return { ...payload, id: REMOTE_ID };
      },
      update: async (id: string, payload: Record<string, unknown>) => {
        apiCalls.push({ method: "update", id, payload });
        return { id, ...payload };
      },
      delete: async (id: string) => {
        apiCalls.push({ method: "delete", id });
        return { success: true };
      },
    },
    tasks: { create: async () => ({}), update: async (id: string) => ({ id }), delete: async () => ({}) },
    projects: { create: async () => ({}), update: async (id: string) => ({ id }), delete: async () => ({}) },
    clients: { create: async () => ({}), update: async (id: string) => ({ id }), delete: async () => ({}) },
    profile: { get: async () => null, upsert: async () => ({}) },
  },
}));

// vi.mock calls above are hoisted, so a plain import still gets the stubs.
import { repairStaleResumedAt, useApp } from "./store-supabase";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TASK_ID = "task-1";
const PROJECT_ID = "project-1";
const MIN = 60_000;

function seedTask() {
  useApp.setState({
    tasks: [
      {
        id: TASK_ID,
        title: "Write the report",
        projectId: PROJECT_ID,
        status: "doing",
        tags: [],
        createdAt: Date.now(),
      } as never,
    ],
    projects: [{ id: PROJECT_ID, name: "Acme", billable: true } as never],
  });
}

function active(): Session {
  const { sessions, activeSessionId } = useApp.getState();
  const s = sessions.find((x) => x.id === activeSessionId);
  if (!s) throw new Error("no active session");
  return s;
}

beforeEach(() => {
  online = true;
  queued.length = 0;
  apiCalls = [];
  vi.useRealTimers();
  useApp.setState({ sessions: [], activeSessionId: null, tasks: [], projects: [], error: null });
  seedTask();
});

// ─── Timeline ────────────────────────────────────────────────────────────────

describe("session timeline", () => {
  it("stamps the current timeline version on new sessions", async () => {
    await useApp.getState().startSession(TASK_ID);
    expect(active().timelineVersion).toBe(TIMELINE_VERSION);
  });

  it("stamps the current timeline version on draft sessions", async () => {
    const draft = await useApp.getState().startDraftSession(PROJECT_ID);
    expect(draft?.timelineVersion).toBe(TIMELINE_VERSION);
  });

  it("does not re-count paused time across a pause/resume cycle", async () => {
    // Regression: resume used to leave a stale `resumedAt` behind, so elapsed
    // was measured from an *earlier* resume and the whole break got billed.
    vi.useFakeTimers();
    const t0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    vi.setSystemTime(t0);

    await useApp.getState().startSession(TASK_ID);

    vi.setSystemTime(t0 + 10 * MIN);
    await useApp.getState().pauseSession();
    expect(active().durationSeconds).toBe(600);

    // 20 minute break, then back to work.
    vi.setSystemTime(t0 + 30 * MIN);
    await useApp.getState().resumeSession();

    vi.setSystemTime(t0 + 31 * MIN);
    expect(elapsedSecondsFor(active())).toBe(660); // 10 worked + 1 worked, break excluded
  });

  it("does not re-count time on a session that already carries resumedAt", async () => {
    // The real-world trigger. Idle recovery stamps `resumedAt`; every later
    // pause/resume then measured elapsed from that *old* stamp, adding the
    // whole intervening stretch — including the break — a second time.
    vi.useFakeTimers();
    const t0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    vi.setSystemTime(t0);
    await useApp.getState().startSession(TASK_ID);

    // Idle recovery resumed the session at t0 with 10 minutes already banked.
    useApp.setState({
      sessions: useApp.getState().sessions.map((s) => ({
        ...s,
        startedAt: t0 - 30 * MIN,
        resumedAt: t0,
        durationSeconds: 600,
        state: "running" as const,
        paused: false,
      })),
    });

    vi.setSystemTime(t0 + 10 * MIN);
    await useApp.getState().pauseSession();
    expect(active().durationSeconds).toBe(1200);

    vi.setSystemTime(t0 + 30 * MIN); // 20 minute break
    await useApp.getState().resumeSession();

    vi.setSystemTime(t0 + 30 * MIN + 1000);
    expect(elapsedSecondsFor(active())).toBe(1201);
  });

  it("keeps startedAt immutable across a resume", async () => {
    vi.useFakeTimers();
    const t0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    vi.setSystemTime(t0);

    await useApp.getState().startSession(TASK_ID);
    const startedAt = active().startedAt;

    vi.setSystemTime(t0 + 10 * MIN);
    await useApp.getState().pauseSession();
    vi.setSystemTime(t0 + 30 * MIN);
    await useApp.getState().resumeSession();

    expect(active().startedAt).toBe(startedAt);
    expect(active().resumedAt).toBe(t0 + 30 * MIN);
  });

  it("survives repeated pause/resume cycles without inflating", async () => {
    vi.useFakeTimers();
    const t0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    vi.setSystemTime(t0);
    await useApp.getState().startSession(TASK_ID);

    let clock = t0;
    for (let i = 0; i < 3; i++) {
      clock += 5 * MIN;
      vi.setSystemTime(clock);
      await useApp.getState().pauseSession();
      clock += 15 * MIN; // long break each time
      vi.setSystemTime(clock);
      await useApp.getState().resumeSession();
    }
    vi.setSystemTime(clock);
    expect(elapsedSecondsFor(active())).toBe(3 * 5 * 60);
  });
});

// ─── Offline ─────────────────────────────────────────────────────────────────

describe("offline session lifecycle", () => {
  it("starts a running timer while offline and queues the create", async () => {
    online = false;
    const session = await useApp.getState().startSession(TASK_ID);

    expect(session).not.toBeNull();
    expect(active().state).toBe("running");
    expect(apiCalls).toHaveLength(0);
    expect(queued).toContainEqual(
      expect.objectContaining({ entity: "sessions", action: "create" })
    );
  });

  it("commits a pause locally while offline instead of throwing it away", async () => {
    await useApp.getState().startSession(TASK_ID);
    online = false;
    apiCalls = [];

    await useApp.getState().pauseSession();

    expect(active().state).toBe("paused");
    expect(useApp.getState().error).toBeNull();
    expect(apiCalls).toHaveLength(0);
    expect(queued.some((q) => q.action === "update" && "state" in q.payload)).toBe(true);
  });

  it("closes the session on stop while offline", async () => {
    await useApp.getState().startSession(TASK_ID);
    online = false;

    await useApp.getState().stopSession();

    const stopped = useApp.getState().sessions[0];
    expect(useApp.getState().activeSessionId).toBeNull();
    expect(stopped.state).toBe("confirmed");
    expect(stopped.endedAt).toBeGreaterThan(0);
  });
});

// ─── Stop ────────────────────────────────────────────────────────────────────

describe("stopSession", () => {
  it("closes a local-only draft instead of leaving it running", async () => {
    // Regression: local ids skipped the remote update, so the row kept
    // state "running" with no endedAt and was re-adopted as active on reload.
    await useApp.getState().startDraftSession(PROJECT_ID);
    await useApp.getState().stopSession();

    const stopped = useApp.getState().sessions[0];
    expect(useApp.getState().activeSessionId).toBeNull();
    expect(stopped.state).toBe("confirmed");
    expect(stopped.endedAt).toBeGreaterThan(0);
    expect(stopped.paused).toBe(true);
  });

  it("banks the elapsed time of a running session", async () => {
    vi.useFakeTimers();
    const t0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    vi.setSystemTime(t0);
    await useApp.getState().startSession(TASK_ID);

    vi.setSystemTime(t0 + 25 * MIN);
    await useApp.getState().stopSession();

    expect(useApp.getState().sessions[0].durationSeconds).toBe(1500);
  });
});

// ─── Migration ───────────────────────────────────────────────────────────────

describe("repairStaleResumedAt", () => {
  const base = { id: "s1", taskId: TASK_ID, projectId: PROJECT_ID, durationSeconds: 600 } as unknown as Session;

  it("drops a resumedAt that predates startedAt", () => {
    const [fixed] = repairStaleResumedAt([{ ...base, startedAt: 2000, resumedAt: 1000 }]);
    expect(fixed.resumedAt).toBeUndefined();
    expect(fixed.startedAt).toBe(2000);
  });

  it("leaves a truthful resumedAt alone", () => {
    const [kept] = repairStaleResumedAt([{ ...base, startedAt: 1000, resumedAt: 2000 }]);
    expect(kept.resumedAt).toBe(2000);
  });

  it("leaves rows without resumedAt alone", () => {
    const [kept] = repairStaleResumedAt([{ ...base, startedAt: 1000 }]);
    expect(kept.resumedAt).toBeUndefined();
    expect(kept.startedAt).toBe(1000);
  });
});

// ─── Id routing ──────────────────────────────────────────────────────────────

describe("local id invariant", () => {
  it("keeps uid() shorter than the remote-id threshold", () => {
    // isRemoteId() routes writes by id length (>= 20 means "the server minted
    // it"). If uid() ever reached 20 chars, local rows would be sent to the
    // edge function as updates and 404 straight back out of the store.
    for (let i = 0; i < 2000; i++) expect(uid().length).toBeLessThan(20);
  });
});
