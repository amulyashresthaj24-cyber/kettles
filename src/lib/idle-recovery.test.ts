import { describe, expect, it } from "vitest";
import { TIMELINE_VERSION } from "./session-timeline";
import { describeIdleResolution, isResolvable, resolveIdleRecovery } from "./idle-recovery";
import type { IdleRecovery, Session } from "./types";

const T0 = 1_700_000_000_000; // fixed epoch, no Date.now() in assertions
const MIN = 60_000;

/** Went idle 10m ago, came back just now, after 25m of tracked work. */
function recovery(partial: Partial<IdleRecovery> = {}): IdleRecovery {
  return {
    id: "r1",
    detectedAt: T0 - 5 * MIN,
    idleStartedAt: T0 - 10 * MIN,
    returnedAt: T0,
    idleSeconds: 300,
    status: "pending",
    ...partial,
  };
}

function session(partial: Partial<Session> = {}): Session {
  return {
    id: "s1",
    taskId: "t1",
    projectId: "p1",
    billable: true,
    startedAt: T0 - 60 * MIN,
    durationSeconds: 25 * 60,
    paused: true,
    state: "paused",
    frozenAt: T0 - 10 * MIN,
    timelineVersion: TIMELINE_VERSION,
    ...partial,
  };
}

describe("isResolvable", () => {
  it("is true only while the gap is pending", () => {
    expect(isResolvable(recovery())).toBe(true);
    expect(isResolvable(recovery({ status: "trimmed" }))).toBe(false);
    expect(isResolvable(undefined)).toBe(false);
  });
});

describe("resolveIdleRecovery — resume_trimmed", () => {
  it("adds nothing back and resumes", () => {
    // The duration was already frozen at the idle boundary when the session
    // paused, so trimming is the absence of a change, not a subtraction.
    const { patch, draft, clearsActiveSession } = resolveIdleRecovery(
      session(),
      recovery(),
      "resume_trimmed",
      T0
    );

    expect(patch.durationSeconds).toBeUndefined();
    expect(patch.state).toBe("running");
    expect(patch.paused).toBe(false);
    expect(patch.resumedAt).toBe(T0);
    expect(patch.frozenAt).toBeUndefined();
    expect(patch.pendingIdleRecovery?.status).toBe("trimmed");
    expect(draft).toBeNull();
    expect(clearsActiveSession).toBe(false);
  });

  it("never rewrites startedAt", () => {
    const s = session();
    const { patch } = resolveIdleRecovery(s, recovery(), "resume_trimmed", T0);
    expect(patch.startedAt).toBeUndefined();
  });
});

describe("resolveIdleRecovery — count_as_work", () => {
  it("gives back exactly the gap, once", () => {
    const { patch } = resolveIdleRecovery(session(), recovery(), "count_as_work", T0);
    expect(patch.durationSeconds).toBe(25 * 60 + 10 * 60);
    expect(patch.pendingIdleRecovery?.status).toBe("counted");
  });

  it("measures the gap to the real return, not the detection reading", () => {
    // Detected after 5m idle but the user stayed away 40m. Counting the
    // detection reading would silently lose 35m of claimed work.
    const away = recovery({ returnedAt: T0 + 30 * MIN });
    const { patch } = resolveIdleRecovery(session(), away, "count_as_work", T0 + 30 * MIN);
    expect(patch.durationSeconds).toBe(25 * 60 + 40 * 60);
  });

  it("cannot be applied twice — the second call is gated by isResolvable", () => {
    const first = resolveIdleRecovery(session(), recovery(), "count_as_work", T0);
    expect(isResolvable(first.patch.pendingIdleRecovery)).toBe(false);
  });
});

describe("resolveIdleRecovery — save_as_draft", () => {
  it("creates one unclassified entry covering exactly the gap", () => {
    const { patch, draft } = resolveIdleRecovery(session(), recovery(), "save_as_draft", T0);

    expect(draft).not.toBeNull();
    expect(draft?.startedAt).toBe(T0 - 10 * MIN);
    expect(draft?.endedAt).toBe(T0);
    expect(draft?.durationSeconds).toBe(10 * 60);
    expect(draft?.source).toBe("idle_recovery");
    expect(draft?.state).toBe("draft");
    expect(draft?.taskId).toBe(""); // unclassified on purpose
    expect(draft?.billable).toBe(false);

    // The original session is not double-counted — it resumes trimmed.
    expect(patch.durationSeconds).toBeUndefined();
    expect(patch.state).toBe("running");
    expect(patch.pendingIdleRecovery?.status).toBe("drafted");
  });

  it("inherits the project so the draft is one click from classified", () => {
    const { draft } = resolveIdleRecovery(
      session({ projectId: "p-acme" }),
      recovery(),
      "save_as_draft",
      T0
    );
    expect(draft?.projectId).toBe("p-acme");
  });

  it("creates no draft for a zero-length gap", () => {
    const instant = recovery({ idleStartedAt: T0, returnedAt: T0 });
    const { draft } = resolveIdleRecovery(session(), instant, "save_as_draft", T0);
    expect(draft).toBeNull();
  });
});

describe("resolveIdleRecovery — finish_at_idle", () => {
  it("ends the session where the user actually stopped", () => {
    const { patch, clearsActiveSession } = resolveIdleRecovery(
      session(),
      recovery(),
      "finish_at_idle",
      T0
    );

    expect(patch.state).toBe("confirmed");
    expect(patch.endedAt).toBe(T0 - 10 * MIN); // idle start, not now
    expect(patch.durationSeconds).toBe(25 * 60); // banked, nothing added
    expect(patch.isDraft).toBe(false);
    expect(patch.pendingIdleRecovery?.status).toBe("finished");
    expect(clearsActiveSession).toBe(true);
  });

  it("does not bill any of the idle stretch", () => {
    const long = recovery({ idleStartedAt: T0 - 3 * 60 * MIN, returnedAt: T0 });
    const { patch } = resolveIdleRecovery(session(), long, "finish_at_idle", T0);
    expect(patch.durationSeconds).toBe(25 * 60);
  });
});

describe("resolveIdleRecovery — shared guarantees", () => {
  it("stamps a return when the user resolved without one recorded", () => {
    // Resolving from the in-app card after a restart: idle-resumed never fired,
    // so the gap has no end until the answer supplies one.
    const open = recovery({ returnedAt: undefined });
    for (const action of ["resume_trimmed", "count_as_work", "save_as_draft", "finish_at_idle"] as const) {
      const { patch } = resolveIdleRecovery(session(), open, action, T0);
      expect(patch.pendingIdleRecovery?.returnedAt).toBe(T0);
    }
  });

  it("always leaves the recovery in a terminal status", () => {
    for (const action of ["resume_trimmed", "count_as_work", "save_as_draft", "finish_at_idle"] as const) {
      const { patch } = resolveIdleRecovery(session(), recovery(), action, T0);
      expect(patch.pendingIdleRecovery?.status).not.toBe("pending");
    }
  });

  it("never produces a negative duration", () => {
    const backwards = recovery({ idleStartedAt: T0, returnedAt: T0 - 5 * MIN });
    for (const action of ["count_as_work", "finish_at_idle"] as const) {
      const { patch } = resolveIdleRecovery(session(), backwards, action, T0);
      expect(patch.durationSeconds ?? 0).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("describeIdleResolution", () => {
  // Editing billable time and then saying nothing is how a ledger tool loses
  // trust. Every answer states the resulting number.
  it("reports the trimmed total", () => {
    const r = recovery();
    const res = resolveIdleRecovery(session(), r, "resume_trimmed", T0);
    expect(describeIdleResolution(res, session(), r, T0)).toBe("Trimmed 10m. Back at 25m.");
  });

  it("reports the new total after counting the gap as work", () => {
    const r = recovery();
    const res = resolveIdleRecovery(session(), r, "count_as_work", T0);
    expect(describeIdleResolution(res, session(), r, T0)).toBe("Counted 10m as work. Now at 35m.");
  });

  it("says where the draft went", () => {
    const r = recovery();
    const res = resolveIdleRecovery(session(), r, "save_as_draft", T0);
    expect(describeIdleResolution(res, session(), r, T0)).toBe(
      "Saved 10m as a draft to classify. Back at 25m."
    );
  });

  it("reports the end time and what was logged", () => {
    const r = recovery();
    const res = resolveIdleRecovery(session(), r, "finish_at_idle", T0);
    expect(describeIdleResolution(res, session(), r, T0)).toContain("25m logged.");
  });

  it("never praises and never blames", () => {
    const banned = /great|nice|well done|oops|sorry|finally|slack/i;
    const r = recovery();
    for (const action of ["resume_trimmed", "count_as_work", "save_as_draft", "finish_at_idle"] as const) {
      const res = resolveIdleRecovery(session(), r, action, T0);
      expect(describeIdleResolution(res, session(), r, T0)).not.toMatch(banned);
    }
  });
});
