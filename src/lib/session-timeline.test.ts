import { describe, expect, it } from "vitest";
import type { Session } from "./types";
import {
  TIMELINE_VERSION,
  activeSince,
  durationAtIdleStart,
  elapsedSecondsFor,
  hasTruthfulTimeline,
  idleGapSeconds,
  idleStartedAt,
  runningStretchMs,
} from "./session-timeline";
import { reconcileSessionBounds } from "./report/data";

const T0 = 1_700_000_000_000; // fixed epoch, no Date.now() in assertions
const MIN = 60_000;

function session(partial: Partial<Session>): Session {
  return {
    id: "s1",
    taskId: "t1",
    projectId: "p1",
    billable: true,
    startedAt: T0,
    durationSeconds: 0,
    paused: false,
    state: "running",
    ...partial,
  };
}

describe("activeSince", () => {
  it("uses startedAt when the session was never resumed", () => {
    expect(activeSince(session({}))).toBe(T0);
  });

  it("uses resumedAt once the session has been resumed", () => {
    expect(activeSince(session({ resumedAt: T0 + 30 * MIN }))).toBe(T0 + 30 * MIN);
  });
});

describe("elapsedSecondsFor", () => {
  it("counts only the current stretch on top of banked time", () => {
    // Ran 25m, paused 10m, resumed 5m ago → 30m of work, not 40m of wall time.
    const s = session({
      durationSeconds: 25 * 60,
      resumedAt: T0 + 35 * MIN,
      state: "running",
    });
    expect(elapsedSecondsFor(s, T0 + 40 * MIN)).toBe(30 * 60);
  });

  it("returns banked time for a paused session", () => {
    const s = session({ durationSeconds: 25 * 60, state: "paused", paused: true });
    expect(elapsedSecondsFor(s, T0 + 90 * MIN)).toBe(25 * 60);
  });

  it("matches legacy behavior when resumedAt is absent", () => {
    const s = session({ durationSeconds: 0, state: "running" });
    expect(elapsedSecondsFor(s, T0 + 10 * MIN)).toBe(10 * 60);
  });
});

describe("runningStretchMs", () => {
  it("measures the current stretch, not the whole session", () => {
    // The staleness check must not freeze a long session resumed a minute ago.
    const s = session({ startedAt: T0, resumedAt: T0 + 6 * 60 * MIN });
    expect(runningStretchMs(s, T0 + 6 * 60 * MIN + MIN)).toBe(MIN);
  });
});

describe("hasTruthfulTimeline", () => {
  it("is false for legacy rows with no version", () => {
    expect(hasTruthfulTimeline(session({}))).toBe(false);
  });

  it("is true at the current version", () => {
    expect(hasTruthfulTimeline(session({ timelineVersion: TIMELINE_VERSION }))).toBe(true);
  });
});

describe("startedAt survives a pause/resume cycle", () => {
  it("keeps the real start so the session lands in the right hour", () => {
    // Regression: resumeSession() used to overwrite startedAt with the resume
    // moment, so a 09:00 session that paused over lunch was reported at 13:00.
    const started = T0;
    const resumed = T0 + 4 * 60 * MIN;
    const s = session({
      startedAt: started,
      resumedAt: resumed,
      durationSeconds: 60 * 60,
      state: "running",
      timelineVersion: TIMELINE_VERSION,
    });

    expect(s.startedAt).toBe(started);
    expect(activeSince(s)).toBe(resumed);
  });
});

describe("reconcileSessionBounds is legacy-only", () => {
  it("still repairs a legacy row where duration exceeds the wall range", () => {
    // Legacy: startedAt was the last segment, duration was the full total.
    const bounds = reconcileSessionBounds(T0 + 50 * MIN, T0 + 60 * MIN, 45 * 60);
    expect(bounds.endedAt).toBe(T0 + 60 * MIN);
    expect(bounds.startedAt).toBe(T0 + 60 * MIN - 45 * 60 * 1000);
  });

  it("still pulls back a legacy late-confirm endedAt", () => {
    const bounds = reconcileSessionBounds(T0, T0 + 120 * MIN, 25 * 60);
    expect(bounds.startedAt).toBe(T0);
    expect(bounds.endedAt).toBe(T0 + 25 * 60 * 1000);
  });

  it("leaves a range alone when duration and wall time agree", () => {
    const bounds = reconcileSessionBounds(T0, T0 + 25 * MIN, 25 * 60);
    expect(bounds).toEqual({ startedAt: T0, endedAt: T0 + 25 * MIN });
  });

  it("would have corrupted a truthful paused session — hence the version gate", () => {
    // 09:00 start, 60m of work spread across a 4h window with pauses.
    // Applying the legacy repair here invents a block ending at 10:00 and
    // throws away the real 13:00 end. selectSessions() must skip it.
    const startedAt = T0;
    const endedAt = T0 + 4 * 60 * MIN;
    const repaired = reconcileSessionBounds(startedAt, endedAt, 60 * 60);
    expect(repaired.endedAt).not.toBe(endedAt);
    expect(repaired.endedAt).toBe(startedAt + 60 * 60 * 1000);
  });
});

// ─── Idle recovery math ──────────────────────────────────────────────────────

describe("idleStartedAt", () => {
  it("rewinds to when input actually stopped, not when it was noticed", () => {
    // The 30s poll means detection always lags. Pausing at `now` would bill the
    // entire idle stretch as work.
    expect(idleStartedAt(T0, 300)).toBe(T0 - 5 * MIN);
  });

  it("treats a negative reading as no idle time", () => {
    expect(idleStartedAt(T0, -60)).toBe(T0);
  });
});

describe("durationAtIdleStart", () => {
  it("counts only the active part of the current stretch", () => {
    // Ran 10m, then went idle for the last 5m of it.
    const s = session({ startedAt: T0 - 10 * MIN, durationSeconds: 0, state: "running" });
    expect(durationAtIdleStart(s, T0, 300)).toBe(5 * 60);
  });

  it("keeps time banked by earlier stretches intact", () => {
    const s = session({
      startedAt: T0 - 60 * MIN,
      resumedAt: T0 - 10 * MIN,
      durationSeconds: 1800, // 30m banked before the last resume
      state: "running",
    });
    expect(durationAtIdleStart(s, T0, 300)).toBe(1800 + 5 * 60);
  });

  it("never subtracts banked time when idle outlasts the current stretch", () => {
    // Resumed 2m ago but the OS reports 30m idle — clock skew, sleep, or a
    // stale reading. Trimming past the resume would delete real earlier work.
    const s = session({
      startedAt: T0 - 90 * MIN,
      resumedAt: T0 - 2 * MIN,
      durationSeconds: 3600,
      state: "running",
    });
    expect(durationAtIdleStart(s, T0, 30 * 60)).toBe(3600);
  });

  it("leaves a session that is not running untouched", () => {
    const s = session({ durationSeconds: 900, state: "paused" });
    expect(durationAtIdleStart(s, T0, 300)).toBe(900);
  });
});

describe("idleGapSeconds", () => {
  it("measures to the return once the user is back", () => {
    expect(idleGapSeconds({ idleStartedAt: T0 - 8 * MIN, returnedAt: T0 }, T0)).toBe(480);
  });

  it("keeps growing while the user is still away", () => {
    // The reading at detection is a floor, not the total.
    expect(idleGapSeconds({ idleStartedAt: T0 - 20 * MIN }, T0)).toBe(1200);
  });

  it("never returns a negative gap", () => {
    expect(idleGapSeconds({ idleStartedAt: T0, returnedAt: T0 - MIN }, T0)).toBe(0);
  });
});
