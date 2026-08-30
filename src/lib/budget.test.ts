import { describe, expect, it } from "vitest";
import {
  BUDGET_WARNING_PCT,
  describeBudget,
  projectBudgetHealth,
  projectsNeedingAttention,
} from "./budget";
import type { Client, Project, Session } from "./types";

const HOUR = 3600;

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Acme redesign",
    billable: true,
    hourlyRate: 100,
    budget: 1000,
    ...over,
  } as Project;
}

function session(seconds: number, over: Partial<Session> = {}): Session {
  return {
    id: `s${seconds}-${Math.round(Math.random() * 1e6)}`,
    taskId: "t1",
    projectId: "p1",
    billable: true,
    startedAt: 1,
    endedAt: 2,
    durationSeconds: seconds,
    paused: true,
    state: "confirmed",
    isDraft: false,
    notes: [],
    ...over,
  } as Session;
}

describe("projectBudgetHealth", () => {
  it("reports none when no budget is set", () => {
    expect(projectBudgetHealth(project({ budget: null }), []).status).toBe("none");
    expect(projectBudgetHealth(project({ budget: 0 }), []).status).toBe("none");
    expect(projectBudgetHealth(undefined, []).status).toBe("none");
  });

  it("counts billable time at the project rate", () => {
    // $100/hr, 4 hours = $400 of a $1000 budget.
    const h = projectBudgetHealth(project(), [session(4 * HOUR)]);
    expect(h.spentCents).toBe(40_000);
    expect(h.remainingCents).toBe(60_000);
    expect(h.usedPct).toBe(40);
    expect(h.status).toBe("ok");
  });

  it("ignores non-billable time", () => {
    // Non-billable work costs the client nothing, so it cannot consume a budget.
    const h = projectBudgetHealth(project(), [
      session(4 * HOUR),
      session(10 * HOUR, { billable: false }),
    ]);
    expect(h.usedPct).toBe(40);
  });

  it("ignores unconfirmed and running sessions", () => {
    const h = projectBudgetHealth(project(), [
      session(4 * HOUR),
      session(5 * HOUR, { state: "running", endedAt: undefined }),
      session(5 * HOUR, { state: "draft", isDraft: true }),
    ]);
    expect(h.usedPct).toBe(40);
  });

  it("ignores sessions from other projects", () => {
    const h = projectBudgetHealth(project(), [
      session(4 * HOUR),
      session(20 * HOUR, { projectId: "other" }),
    ]);
    expect(h.usedPct).toBe(40);
  });

  it("inherits the client rate when the project has none", () => {
    const client = { id: "c1", name: "Acme", hourlyRate: 50 } as Client;
    const h = projectBudgetHealth(
      project({ hourlyRate: null, clientId: "c1" }),
      [session(4 * HOUR)],
      client
    );
    expect(h.spentCents).toBe(20_000); // 4h at the client's $50
  });

  it("warns at the threshold", () => {
    const h = projectBudgetHealth(project(), [session(8 * HOUR)]);
    expect(h.usedPct).toBe(BUDGET_WARNING_PCT);
    expect(h.status).toBe("warning");
  });

  it("goes over at 100% and keeps counting past it", () => {
    const h = projectBudgetHealth(project(), [session(14 * HOUR)]);
    expect(h.usedPct).toBe(140);
    expect(h.status).toBe("over");
    expect(h.remainingCents).toBe(-40_000);
    expect(describeBudget(h)).toBe("40% over budget");
  });

  it("converts what is left into affordable hours", () => {
    const h = projectBudgetHealth(project(), [session(4 * HOUR)]);
    expect(h.remainingSeconds).toBe(6 * HOUR); // $600 left at $100/hr
  });

  it("reports no affordable hours once over budget", () => {
    expect(projectBudgetHealth(project(), [session(14 * HOUR)]).remainingSeconds).toBe(0);
  });

  it("cannot convert to hours without a rate", () => {
    const h = projectBudgetHealth(project({ hourlyRate: null }), [session(4 * HOUR)]);
    expect(h.remainingSeconds).toBeNull();
    expect(h.spentCents).toBe(0);
  });

  it("is lifetime, not period-scoped", () => {
    // The point of the module: every confirmed session counts, whenever it ran.
    const old = session(5 * HOUR, { endedAt: 1_600_000_000_000 });
    const recent = session(5 * HOUR, { endedAt: 1_790_000_000_000 });
    expect(projectBudgetHealth(project(), [old, recent]).usedPct).toBe(100);
  });
});

describe("projectsNeedingAttention", () => {
  it("returns only warning and over projects, worst first", () => {
    const a = project({ id: "a", budget: 1000 }); // 40% — fine
    const b = project({ id: "b", budget: 1000 }); // 90% — warning
    const c = project({ id: "c", budget: 1000 }); // 140% — over
    const sessions = [
      session(4 * HOUR, { projectId: "a" }),
      session(9 * HOUR, { projectId: "b" }),
      session(14 * HOUR, { projectId: "c" }),
    ];
    const flagged = projectsNeedingAttention([a, b, c], sessions, []);
    expect(flagged.map((f) => f.project.id)).toEqual(["c", "b"]);
  });

  it("returns nothing when no budgets are set", () => {
    expect(projectsNeedingAttention([project({ budget: null })], [session(HOUR)], [])).toEqual([]);
  });
});
