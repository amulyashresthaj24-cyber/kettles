import { describe, expect, it } from "vitest";
import {
  billedThroughEndMs,
  billedTimelineLayout,
  formatBilledThroughLabel,
  isSessionBilled,
  isTimestampBilled,
  parseBilledThrough,
  summarizeProjectBilled,
  toLocalDateString,
} from "./billed";
import { selectSessions } from "./report/data";
import type { Project, Session } from "./types";

const HOUR = 3600;

function atLocal(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime();
}

function project(partial: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Acme site",
    color: "indigo",
    billable: true,
    hourlyRate: 100,
    ...partial,
  };
}

function session(partial: Partial<Session>): Session {
  return {
    id: "s1",
    taskId: "t1",
    projectId: "p1",
    billable: true,
    startedAt: atLocal(2026, 9, 1, 9),
    endedAt: atLocal(2026, 9, 1, 11),
    durationSeconds: 2 * HOUR,
    paused: false,
    state: "confirmed",
    ...partial,
  };
}

describe("parseBilledThrough", () => {
  it("accepts a real calendar day", () => {
    expect(parseBilledThrough("2026-09-15")).toBe("2026-09-15");
  });

  it("rejects impossible dates and junk", () => {
    expect(parseBilledThrough("2026-02-31")).toBeNull();
    expect(parseBilledThrough("15/09/2026")).toBeNull();
    expect(parseBilledThrough("")).toBeNull();
    expect(parseBilledThrough(null)).toBeNull();
  });
});

describe("toLocalDateString", () => {
  it("does not shift the day through UTC", () => {
    expect(toLocalDateString(new Date(2026, 8, 15, 23, 30))).toBe("2026-09-15");
  });
});

describe("isTimestampBilled", () => {
  it("treats the cutoff day as inclusive", () => {
    expect(isTimestampBilled(atLocal(2026, 9, 15, 23), "2026-09-15")).toBe(true);
    expect(isTimestampBilled(atLocal(2026, 9, 16, 0), "2026-09-15")).toBe(false);
  });

  it("is false when no cutoff is set", () => {
    expect(isTimestampBilled(atLocal(2026, 9, 1), null)).toBe(false);
    expect(isTimestampBilled(atLocal(2026, 9, 1), undefined)).toBe(false);
  });

  it("ends at local midnight of the next day", () => {
    expect(billedThroughEndMs("2026-09-15")).toBe(atLocal(2026, 9, 16, 0));
  });
});

describe("isSessionBilled", () => {
  it("uses endedAt, not startedAt", () => {
    const overnight = session({
      startedAt: atLocal(2026, 9, 15, 22),
      endedAt: atLocal(2026, 9, 16, 1),
      durationSeconds: 3 * HOUR,
    });
    expect(isSessionBilled(overnight, "2026-09-15")).toBe(false);
  });

  it("ignores sessions that have not ended", () => {
    expect(isSessionBilled(session({ endedAt: undefined }), "2026-09-15")).toBe(false);
  });
});

describe("formatBilledThroughLabel", () => {
  it("names the inclusive day", () => {
    expect(formatBilledThroughLabel("2026-09-15")).toBe("Billed through Sep 15, 2026");
  });
});

describe("summarizeProjectBilled", () => {
  const billed = session({
    id: "billed",
    startedAt: atLocal(2026, 9, 10, 9),
    endedAt: atLocal(2026, 9, 10, 12),
    durationSeconds: 3 * HOUR,
  });
  const unbilled = session({
    id: "open",
    startedAt: atLocal(2026, 9, 20, 9),
    endedAt: atLocal(2026, 9, 20, 11),
    durationSeconds: 2 * HOUR,
  });
  const internal = session({
    id: "internal",
    billable: false,
    startedAt: atLocal(2026, 9, 10, 14),
    endedAt: atLocal(2026, 9, 10, 15),
    durationSeconds: HOUR,
  });
  const draft = session({
    id: "draft",
    state: "draft",
    startedAt: atLocal(2026, 9, 10, 16),
    endedAt: atLocal(2026, 9, 10, 17),
    durationSeconds: HOUR,
  });

  it("splits confirmed time on the cutoff and ignores drafts", () => {
    const summary = summarizeProjectBilled(
      [billed, unbilled, internal, draft],
      project({ billedThrough: "2026-09-15" })
    );
    expect(summary.sessionCount).toBe(3);
    expect(summary.billedSessionCount).toBe(2);
    expect(summary.billedSeconds).toBe(4 * HOUR);
    expect(summary.billedBillableSeconds).toBe(3 * HOUR);
    expect(summary.billedEarningsCents).toBe(30000);
    expect(summary.unbilledSeconds).toBe(2 * HOUR);
    expect(summary.unbilledBillableSeconds).toBe(2 * HOUR);
    expect(summary.unbilledEarningsCents).toBe(20000);
    expect(summary.nonBillableSeconds).toBe(HOUR);
  });

  it("treats every session as unbilled when the cutoff is missing", () => {
    const summary = summarizeProjectBilled([billed, unbilled], project());
    expect(summary.billedSeconds).toBe(0);
    expect(summary.unbilledSeconds).toBe(5 * HOUR);
    expect(summary.unbilledEarningsCents).toBe(50000);
  });

  it("skips other projects", () => {
    const other = session({ id: "other", projectId: "p2" });
    const summary = summarizeProjectBilled([billed, other], project({ billedThrough: "2026-09-15" }));
    expect(summary.sessionCount).toBe(1);
    expect(summary.billedSeconds).toBe(3 * HOUR);
  });
});

describe("billedTimelineLayout", () => {
  it("places the cutoff between first and last session", () => {
    const summary = summarizeProjectBilled(
      [
        session({
          startedAt: atLocal(2026, 9, 1, 9),
          endedAt: atLocal(2026, 9, 1, 11),
        }),
        session({
          id: "s2",
          startedAt: atLocal(2026, 9, 30, 9),
          endedAt: atLocal(2026, 9, 30, 11),
        }),
      ],
      project({ billedThrough: "2026-09-15" })
    );
    const layout = billedTimelineLayout(summary, atLocal(2026, 9, 30, 11));
    expect(layout).not.toBeNull();
    expect(layout!.cutoffPct).toBeGreaterThan(20);
    expect(layout!.cutoffPct).toBeLessThan(80);
  });

  it("returns null when there is no span yet", () => {
    expect(billedTimelineLayout(summarizeProjectBilled([], project()))).toBeNull();
  });
});

describe("selectSessions billed filter", () => {
  const range = {
    start: new Date(2026, 8, 1),
    end: new Date(2026, 8, 30, 23, 59, 59, 999),
    label: "September 2026",
    key: "2026-09",
  };
  const billed = session({
    id: "billed",
    startedAt: atLocal(2026, 9, 10, 9),
    endedAt: atLocal(2026, 9, 10, 12),
    durationSeconds: 3 * HOUR,
  });
  const open = session({
    id: "open",
    startedAt: atLocal(2026, 9, 20, 9),
    endedAt: atLocal(2026, 9, 20, 11),
    durationSeconds: 2 * HOUR,
  });
  const src = {
    sessions: [billed, open],
    projects: [project({ billedThrough: "2026-09-15" })],
    tasks: [],
    clients: [],
  };

  it("keeps only unbilled sessions", () => {
    const rows = selectSessions(src, {
      range,
      projectId: null,
      clientId: null,
      tag: null,
      billable: "all",
      billed: "unbilled",
    });
    expect(rows.map((r) => r.session.id)).toEqual(["open"]);
    expect(rows[0].billed).toBe(false);
  });

  it("keeps only already billed sessions", () => {
    const rows = selectSessions(src, {
      range,
      projectId: null,
      clientId: null,
      tag: null,
      billable: "all",
      billed: "billed",
    });
    expect(rows.map((r) => r.session.id)).toEqual(["billed"]);
    expect(rows[0].billed).toBe(true);
  });
});
