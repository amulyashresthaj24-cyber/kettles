import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Client, Project, Session, Task } from "./types";
import {
  DEFAULT_PET_POLICY,
  MISSING_RATE_GRACE_SECONDS,
  STALE_DRAFT_AFTER_MS,
  candidateInterventions,
  derivePetContext,
  describePetCoverage,
  inQuietHours,
  localDayParts,
  parseClockMinutes,
  projectBudgetUsedPct,
  prunePetHistory,
  recordPetIntervention,
  resolvePetIntervention,
  selectPetIntervention,
  taskActuals,
  type PetContextInput,
  type PetInterventionRecord,
} from "./pet-context";

const T0 = 1_700_000_000_000; // fixed epoch, no Date.now() in assertions
const MIN = 60_000;
const DAY_START = T0 - 4 * 60 * MIN; // "now" sits 4h into the local day
const DATE_KEY = "2023-11-14";

function session(partial: Partial<Session> & { id: string }): Session {
  return {
    taskId: "t1",
    projectId: "p1",
    billable: true,
    startedAt: DAY_START,
    durationSeconds: 0,
    paused: false,
    state: "confirmed",
    endedAt: DAY_START + 10 * MIN,
    ...partial,
  };
}

function task(partial: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Send Acme revisions",
    urgency: "normal",
    status: "doing",
    createdAt: T0,
    ...partial,
  };
}

function project(partial: Partial<Project> = {}): Project {
  return { id: "p1", name: "Acme site", color: "indigo", billable: true, ...partial };
}

function input(partial: Partial<PetContextInput> = {}): PetContextInput {
  return {
    now: T0,
    dayStartMs: DAY_START,
    minuteOfDay: 12 * 60, // midday, outside default quiet hours
    dateKey: DATE_KEY,
    activeSessionId: null,
    sessions: [],
    tasks: [task()],
    projects: [project()],
    clients: [],
    ...partial,
  };
}

// ─── Time helpers ────────────────────────────────────────────────────────────

describe("parseClockMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseClockMinutes("08:30")).toBe(510);
    expect(parseClockMinutes("00:00")).toBe(0);
  });

  it("rejects malformed and out-of-range values", () => {
    expect(parseClockMinutes("24:00")).toBeNull();
    expect(parseClockMinutes("08:60")).toBeNull();
    expect(parseClockMinutes("morning")).toBeNull();
  });
});

describe("inQuietHours", () => {
  it("handles a window that crosses midnight", () => {
    expect(inQuietHours(23 * 60, "22:00", "08:00")).toBe(true);
    expect(inQuietHours(2 * 60, "22:00", "08:00")).toBe(true);
    expect(inQuietHours(12 * 60, "22:00", "08:00")).toBe(false);
    expect(inQuietHours(8 * 60, "22:00", "08:00")).toBe(false);
  });

  it("handles a same-day window", () => {
    expect(inQuietHours(13 * 60, "12:00", "14:00")).toBe(true);
    expect(inQuietHours(15 * 60, "12:00", "14:00")).toBe(false);
  });

  it("never silences the pet forever on unparseable input", () => {
    expect(inQuietHours(12 * 60, "nonsense", "08:00")).toBe(false);
    expect(inQuietHours(12 * 60, "09:00", "09:00")).toBe(false);
  });
});

describe("localDayParts", () => {
  it("returns a midnight boundary and a matching date key", () => {
    const parts = localDayParts(T0);
    const d = new Date(parts.dayStartMs);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(parts.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parts.minuteOfDay).toBe(new Date(T0).getHours() * 60 + new Date(T0).getMinutes());
  });
});

// ─── taskActuals ─────────────────────────────────────────────────────────────

describe("taskActuals", () => {
  it("counts confirmed, draft and the live session exactly once each", () => {
    const sessions = [
      session({ id: "a", durationSeconds: 600 }),
      session({ id: "b", state: "draft", endedAt: undefined, durationSeconds: 300 }),
      session({
        id: "live",
        state: "running",
        endedAt: undefined,
        durationSeconds: 0,
        startedAt: T0 - 2 * MIN,
      }),
    ];
    const actuals = taskActuals(sessions, "t1", "live", T0, DAY_START);
    expect(actuals.confirmedSeconds).toBe(600);
    expect(actuals.draftSeconds).toBe(300);
    expect(actuals.activeSeconds).toBe(120);
    expect(actuals.observedSeconds).toBe(1020);
  });

  it("excludes discarded sessions", () => {
    const sessions = [session({ id: "a", state: "discarded", durationSeconds: 9999 })];
    expect(taskActuals(sessions, "t1", null, T0, DAY_START).observedSeconds).toBe(0);
  });

  it("excludes a stale open session that is not the active one", () => {
    // Crash / other device leaves a running row behind. Counting it would
    // inflate the task by however long that row has been open.
    const sessions = [
      session({ id: "stale", state: "running", endedAt: undefined, startedAt: T0 - 300 * MIN }),
      session({ id: "a", durationSeconds: 60 }),
    ];
    const actuals = taskActuals(sessions, "t1", null, T0, DAY_START);
    expect(actuals.activeSeconds).toBe(0);
    expect(actuals.observedSeconds).toBe(60);
  });

  it("stops accruing on a transitional row that is paused but still marked running", () => {
    // A pause call in flight leaves state:"running" with paused:true. Accruing
    // there drifts against what the timer UI shows.
    const sessions = [
      session({
        id: "live",
        state: "running",
        paused: true,
        endedAt: undefined,
        durationSeconds: 300,
        startedAt: T0 - 60 * MIN,
      }),
    ];
    expect(taskActuals(sessions, "t1", "live", T0, DAY_START).activeSeconds).toBe(300);
  });

  it("ignores sessions belonging to other tasks", () => {
    const sessions = [session({ id: "a", taskId: "other", durationSeconds: 600 })];
    expect(taskActuals(sessions, "t1", null, T0, DAY_START).observedSeconds).toBe(0);
  });

  it("counts today's starts and confirmations against the local day boundary", () => {
    const sessions = [
      session({ id: "yesterday", startedAt: DAY_START - 60 * MIN, endedAt: DAY_START - 30 * MIN }),
      session({ id: "today", startedAt: DAY_START + MIN, endedAt: DAY_START + 20 * MIN }),
    ];
    const actuals = taskActuals(sessions, "t1", null, T0, DAY_START);
    expect(actuals.sessionsStartedToday).toBe(1);
    expect(actuals.confirmedToday).toBe(1);
  });

  it("returns zeros for an empty task id rather than matching blank drafts", () => {
    const sessions = [session({ id: "unclassified", taskId: "", durationSeconds: 600 })];
    expect(taskActuals(sessions, "", null, T0, DAY_START).observedSeconds).toBe(0);
  });
});

// ─── projectBudgetUsedPct ────────────────────────────────────────────────────

describe("projectBudgetUsedPct", () => {
  it("treats budget as dollars", () => {
    // 2h billable at $100/hr = $200 against a $1000 budget.
    const sessions = [session({ id: "a", durationSeconds: 7200 })];
    const pct = projectBudgetUsedPct(sessions, project({ budget: 1000, hourlyRate: 100 }), []);
    expect(pct).toBeCloseTo(20);
  });

  it("inherits the client rate when the project has none", () => {
    const clients: Client[] = [{ id: "c1", name: "Acme", hourlyRate: 50 }];
    const sessions = [session({ id: "a", durationSeconds: 7200 })];
    const pct = projectBudgetUsedPct(
      sessions,
      project({ budget: 1000, clientId: "c1" }),
      clients
    );
    expect(pct).toBeCloseTo(10);
  });

  it("returns null without a budget or without a rate", () => {
    const sessions = [session({ id: "a", durationSeconds: 7200 })];
    expect(projectBudgetUsedPct(sessions, project({ hourlyRate: 100 }), [])).toBeNull();
    expect(projectBudgetUsedPct(sessions, project({ budget: 1000 }), [])).toBeNull();
    expect(projectBudgetUsedPct(sessions, undefined, [])).toBeNull();
  });

  it("ignores non-billable and unconfirmed time", () => {
    const sessions = [
      session({ id: "a", durationSeconds: 7200, billable: false }),
      session({ id: "b", durationSeconds: 7200, state: "draft", endedAt: undefined }),
    ];
    expect(projectBudgetUsedPct(sessions, project({ budget: 1000, hourlyRate: 100 }), [])).toBe(0);
  });
});

// ─── derivePetContext ────────────────────────────────────────────────────────

describe("derivePetContext", () => {
  it("totals today's confirmed and billable time", () => {
    const ctx = derivePetContext(
      input({
        sessions: [
          session({ id: "a", durationSeconds: 600 }),
          session({ id: "b", durationSeconds: 300, billable: false }),
          session({ id: "old", durationSeconds: 900, startedAt: DAY_START - 60 * MIN, endedAt: DAY_START - 30 * MIN }),
        ],
      })
    );
    expect(ctx.todayConfirmedSeconds).toBe(900);
    expect(ctx.todayBillableSeconds).toBe(600);
  });

  it("counts drafts as ledger debt regardless of day", () => {
    const ctx = derivePetContext(
      input({
        sessions: [
          session({ id: "d1", state: "draft", endedAt: undefined, durationSeconds: 120 }),
          session({
            id: "d2",
            state: "draft",
            endedAt: undefined,
            durationSeconds: 60,
            startedAt: DAY_START - 5 * 24 * 60 * MIN,
          }),
        ],
      })
    );
    expect(ctx.draftCount).toBe(2);
    expect(ctx.todayDraftSeconds).toBe(120); // only today's draft counts toward today
  });

  it("marks same-day drafts stale after thirty minutes", () => {
    const oldDraft = session({
      id: "old-draft",
      state: "draft",
      endedAt: undefined,
      startedAt: T0 - 60 * MIN,
      frozenAt: T0 - STALE_DRAFT_AFTER_MS,
      durationSeconds: 47 * 60,
    });
    const freshDraft = session({
      id: "fresh-draft",
      state: "draft",
      endedAt: undefined,
      startedAt: T0 - 20 * MIN,
      frozenAt: T0 - 20 * MIN,
      durationSeconds: 10 * 60,
    });

    const ctx = derivePetContext(input({ sessions: [oldDraft, freshDraft] }));

    expect(ctx.draftCount).toBe(2);
    expect(ctx.staleDraftCount).toBe(1);
    expect(ctx.staleDraftSeconds).toBe(47 * 60);
    expect(ctx.oldestStaleDraftKey).toBe(String(oldDraft.startedAt));
  });

  it("marks a draft stale after it crosses local midnight", () => {
    const earlyNow = DAY_START + 5 * MIN;
    const carriedDraft = session({
      id: "carried",
      state: "draft",
      endedAt: undefined,
      startedAt: DAY_START - 20 * MIN,
      frozenAt: DAY_START - MIN,
      durationSeconds: 12 * 60,
    });

    const ctx = derivePetContext(
      input({
        now: earlyNow,
        dayStartMs: DAY_START,
        minuteOfDay: 5,
        sessions: [carriedDraft],
      })
    );

    expect(earlyNow - carriedDraft.frozenAt!).toBeLessThan(STALE_DRAFT_AFTER_MS);
    expect(ctx.staleDraftCount).toBe(1);
  });

  it("does not treat an active unclassified draft as stale", () => {
    const liveDraft = session({
      id: "live-draft",
      taskId: "",
      state: "running",
      isDraft: true,
      endedAt: undefined,
      startedAt: T0 - 90 * MIN,
      durationSeconds: 90 * 60,
    });

    const ctx = derivePetContext(
      input({ activeSessionId: "live-draft", sessions: [liveDraft] })
    );

    expect(ctx.draftCount).toBe(0);
    expect(ctx.staleDraftCount).toBe(0);
    expect(ctx.oldestStaleDraftKey).toBeNull();
  });

  it("uses the task estimate, not the session estimate, as the overrun denominator", () => {
    const live = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      durationSeconds: 3600,
      estimateMinutes: 25, // Pomodoro target — must not become the task denominator
      startedAt: T0,
    });
    const ctx = derivePetContext(
      input({
        activeSessionId: "live",
        sessions: [live],
        tasks: [task({ estimateMinutes: 60 })],
      })
    );
    expect(ctx.taskEstimateSeconds).toBe(3600);
    expect(ctx.taskEstimateRatio).toBeCloseTo(1);
  });

  it("returns a null ratio when the task carries no usable estimate", () => {
    const live = session({ id: "live", state: "running", endedAt: undefined, durationSeconds: 3600, startedAt: T0 });
    for (const estimateMinutes of [undefined, 0, -5]) {
      const ctx = derivePetContext(
        input({ activeSessionId: "live", sessions: [live], tasks: [task({ estimateMinutes })] })
      );
      expect(ctx.taskEstimateRatio).toBeNull();
      expect(ctx.taskEstimateSeconds).toBeNull();
    }
  });

  it("flags a billable session with no resolvable rate", () => {
    const live = session({ id: "live", state: "running", endedAt: undefined, startedAt: T0 });
    const withoutRate = derivePetContext(input({ activeSessionId: "live", sessions: [live] }));
    expect(withoutRate.missingRateOnBillable).toBe(true);

    const withRate = derivePetContext(
      input({ activeSessionId: "live", sessions: [live], projects: [project({ hourlyRate: 90 })] })
    );
    expect(withRate.missingRateOnBillable).toBe(false);
  });

  it("does not flag a missing rate on a non-billable session", () => {
    const live = session({ id: "live", state: "running", endedAt: undefined, startedAt: T0, billable: false });
    expect(derivePetContext(input({ activeSessionId: "live", sessions: [live] })).missingRateOnBillable).toBe(
      false
    );
  });

  it("is inert with no active session", () => {
    const ctx = derivePetContext(input());
    expect(ctx.activeTaskId).toBeNull();
    expect(ctx.taskActuals).toBeNull();
    expect(ctx.taskEstimateRatio).toBeNull();
    expect(ctx.missingRateOnBillable).toBe(false);
  });
});

// ─── describePetCoverage ─────────────────────────────────────────────────────

describe("describePetCoverage", () => {
  it("distinguishes disabled intelligence", () => {
    const coverageInput = input({ petIntelligenceEnabled: false });
    const ctx = derivePetContext(coverageInput);

    expect(describePetCoverage(ctx, coverageInput)).toBe("Warnings are off.");
  });

  it("distinguishes nothing being tracked", () => {
    const coverageInput = input();
    const ctx = derivePetContext(coverageInput);

    expect(describePetCoverage(ctx, coverageInput)).toBe("Not tracking anything.");
  });

  it("distinguishes insufficient estimate data", () => {
    const live = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      billable: false,
      startedAt: T0,
    });
    const coverageInput = input({
      activeSessionId: "live",
      sessions: [live],
      tasks: [task({ estimateMinutes: undefined })],
      projects: [project({ billable: false })],
    });
    const ctx = derivePetContext(coverageInput);

    expect(describePetCoverage(ctx, coverageInput)).toBe(
      "No estimate on Send Acme revisions. Estimates on 0/1 tasks."
    );
  });

  it("distinguishes an all-clear state", () => {
    const live = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      startedAt: T0,
      durationSeconds: 60,
    });
    const coverageInput = input({
      activeSessionId: "live",
      sessions: [live],
      tasks: [
        task({ estimateMinutes: 60 }),
        task({ id: "t2", title: "Prepare handoff", estimateMinutes: undefined }),
      ],
      projects: [project({ hourlyRate: 90 })],
    });
    const ctx = derivePetContext(coverageInput);

    expect(describePetCoverage(ctx, coverageInput)).toBe(
      "All clear. Estimates on 1/2 tasks."
    );
  });

  it("does not report all clear while an intervention is justified", () => {
    const live = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      startedAt: T0,
      durationSeconds: 13 * 60,
    });
    const coverageInput = input({
      activeSessionId: "live",
      sessions: [live],
      tasks: [task({ estimateMinutes: 10 })],
      projects: [project({ hourlyRate: 90 })],
    });
    const ctx = derivePetContext(coverageInput);

    expect(describePetCoverage(ctx, coverageInput)).toBe(
      "Something needs review. Estimates on 1/1 tasks."
    );
  });
});

// ─── candidateInterventions ──────────────────────────────────────────────────

function runningContext(overrides: Partial<PetContextInput> = {}, elapsedSeconds = 60) {
  const live = session({
    id: "live",
    state: "running",
    endedAt: undefined,
    durationSeconds: elapsedSeconds,
    startedAt: T0,
  });
  return derivePetContext(input({ activeSessionId: "live", sessions: [live], ...overrides }));
}

describe("candidateInterventions", () => {
  it("ranks a missing rate above an estimate overrun", () => {
    // Inside the missing-rate grace window and already past 125% of a 1m
    // estimate, so both candidates are live and the order is what is under test.
    const ctx = runningContext({ tasks: [task({ estimateMinutes: 1 })] }, 120);
    const kinds = candidateInterventions(ctx).map((c) => c.kind);
    expect(kinds[0]).toBe("missing_rate");
    expect(kinds).toContain("estimate_overrun");
  });

  it("does not raise a missing rate while the session is paused", () => {
    // A paused session accrues nothing to misprice, and one parked below the
    // grace window would otherwise re-raise this every single day.
    const paused = session({
      id: "live",
      state: "paused",
      paused: true,
      endedAt: undefined,
      startedAt: T0,
      durationSeconds: 30,
    });
    const ctx = derivePetContext(input({ activeSessionId: "live", sessions: [paused] }));
    expect(ctx.missingRateOnBillable).toBe(true);
    expect(ctx.activeSessionRunning).toBe(false);
    expect(candidateInterventions(ctx).map((c) => c.kind)).not.toContain("missing_rate");
  });

  it("stops raising a missing rate once the session is underway", () => {
    const ctx = runningContext({}, MISSING_RATE_GRACE_SECONDS + 60);
    expect(candidateInterventions(ctx).map((c) => c.kind)).not.toContain("missing_rate");
  });

  it("warns at 80% and escalates at 125%, never both", () => {
    const warn = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      8 * 60
    );
    expect(candidateInterventions(warn).map((c) => c.kind)).toEqual(["estimate_warning"]);

    const over = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      13 * 60
    );
    expect(candidateInterventions(over).map((c) => c.kind)).toEqual(["estimate_overrun"]);
  });

  it("ranks stale drafts after an overrun and before an estimate warning", () => {
    // A leftover from different work. It must not feed the active task's
    // actuals, or its 47 minutes would push the warning case into an overrun
    // and the ordering under test here would never be exercised.
    const staleDraft = session({
      id: "stale-draft",
      taskId: "t-other",
      state: "draft",
      endedAt: undefined,
      startedAt: T0 - 60 * MIN,
      frozenAt: T0 - 40 * MIN,
      durationSeconds: 47 * 60,
    });

    const overrunLive = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      startedAt: T0,
      durationSeconds: 13 * 60,
    });
    const overrun = derivePetContext(
      input({
        activeSessionId: "live",
        sessions: [overrunLive, staleDraft],
        tasks: [task({ estimateMinutes: 10 })],
        projects: [project({ hourlyRate: 90 })],
      })
    );
    expect(candidateInterventions(overrun).map((c) => c.kind)).toEqual([
      "estimate_overrun",
      "stale_drafts",
    ]);

    const warningLive = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      startedAt: T0,
      durationSeconds: 8 * 60,
    });
    const warning = derivePetContext(
      input({
        activeSessionId: "live",
        sessions: [warningLive, staleDraft],
        tasks: [task({ estimateMinutes: 10 })],
        projects: [project({ hourlyRate: 90 })],
      })
    );
    expect(candidateInterventions(warning).map((c) => c.kind)).toEqual([
      "stale_drafts",
      "estimate_warning",
    ]);
  });

  it("describes stale draft count and duration without estimate or billing data", () => {
    const ctx = derivePetContext(
      input({
        sessions: [
          session({
            id: "d1",
            state: "draft",
            endedAt: undefined,
            billable: false,
            startedAt: T0 - 90 * MIN,
            frozenAt: T0 - 60 * MIN,
            durationSeconds: 20 * 60,
          }),
          session({
            id: "d2",
            state: "draft",
            endedAt: undefined,
            billable: false,
            startedAt: T0 - 80 * MIN,
            frozenAt: T0 - 50 * MIN,
            durationSeconds: 27 * 60,
          }),
        ],
        tasks: [],
        projects: [],
      })
    );

    const stale = candidateInterventions(ctx).find((c) => c.kind === "stale_drafts");
    expect(stale?.severity).toBe("warning");
    expect(stale?.quote).toBe("2 sessions waiting for review. 47m unclassified.");
  });

  it("keeps a stale-draft key stable across entity id remapping", () => {
    const startedAt = T0 - 90 * MIN;
    const local = derivePetContext(
      input({
        sessions: [
          session({
            id: "local-session-id",
            state: "draft",
            endedAt: undefined,
            startedAt,
            frozenAt: T0 - 60 * MIN,
          }),
        ],
      })
    );
    const remote = derivePetContext(
      input({
        sessions: [
          session({
            id: "remote-session-id",
            state: "draft",
            endedAt: undefined,
            startedAt,
            frozenAt: T0 - 60 * MIN,
          }),
        ],
      })
    );

    expect(candidateInterventions(remote)[0]?.key).toBe(
      candidateInterventions(local)[0]?.key
    );
  });

  it("attaches executable actions to both estimate interventions", () => {
    const warning = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      8 * 60
    );
    expect(
      candidateInterventions(warning)
        .find((c) => c.kind === "estimate_warning")
        ?.actions?.map((a) => a.action)
    ).toEqual(["finishEstimateSession", "dismissPetIntervention"]);

    const overrun = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      13 * 60
    );
    const overrunIntervention = candidateInterventions(overrun).find(
      (c) => c.kind === "estimate_overrun"
    );
    expect(overrunIntervention?.actions?.map((a) => a.action)).toEqual([
      "finishEstimateSession",
      "reestimateTask",
      "dismissPetIntervention",
    ]);

    const reestimate = overrunIntervention?.actions?.find(
      (a) => a.action === "reestimateTask"
    );
    expect(reestimate?.label).toBe("Re-estimate to 15m");
    expect(reestimate?.payload).toEqual({
      taskId: "t1",
      estimateMinutes: 15,
      interventionKey: "estimate_overrun:t1",
    });
  });

  it("stays silent below the warning threshold", () => {
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 60 })], projects: [project({ hourlyRate: 90 })] },
      10 * 60
    );
    expect(candidateInterventions(ctx)).toEqual([]);
  });

  it("only uses animation states the running pet can actually render", () => {
    // Read the real config rather than a second hardcoded list. The predecessor
    // of this module declared eleven state names mapped to rows 0-10 on a
    // nine-row sheet, and nothing caught it because nothing compared the two.
    const configPath = path.resolve(__dirname, "../../public/pet/pet.config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      states: Record<string, { row: number }>;
      sheet: { rows: number };
    };
    const runtimeStates = Object.keys(config.states);

    const ctx = runningContext({ tasks: [task({ estimateMinutes: 1 })] }, 120);
    const candidates = candidateInterventions(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(runtimeStates).toContain(candidate.state);
      // And the row it points at has to exist on the sheet.
      expect(config.states[candidate.state].row).toBeLessThan(config.sheet.rows);
    }
  });

  it("never prints a quote that contradicts the threshold that fired it", () => {
    // 75s against a 60s estimate is a real 125% overrun. Rounding both figures
    // to nearest would print "1m against a 1m estimate".
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 1 })], projects: [project({ hourlyRate: 90 })] },
      75
    );
    // Phrasing varies by key, so assert the invariant rather than one wording:
    // both true figures appear and they are not collapsed into the same number.
    const overrun = candidateInterventions(ctx).find((c) => c.kind === "estimate_overrun");
    expect(overrun?.quote).toContain("2m");
    expect(overrun?.quote).toContain("1m");
    expect(overrun?.quote).not.toContain("1m against a 1m");
  });

  it("warns about a billable session that has no project at all", () => {
    const live = session({
      id: "live",
      state: "running",
      endedAt: undefined,
      startedAt: T0,
      projectId: "",
      durationSeconds: 30,
    });
    const ctx = derivePetContext(input({ activeSessionId: "live", sessions: [live], projects: [] }));
    const missing = candidateInterventions(ctx).find((c) => c.kind === "missing_rate");
    expect(missing).toBeDefined();
    expect(missing?.quote).toContain("no project");
  });

  it("never uses guilt language", () => {
    const ctx = runningContext({ tasks: [task({ estimateMinutes: 1 })] }, 120);
    const banned = /behind|should have|failed|lazy|wasted|only|still not/i;
    for (const candidate of candidateInterventions(ctx)) {
      expect(candidate.quote).not.toMatch(banned);
    }
  });
});

// ─── selectPetIntervention ───────────────────────────────────────────────────

describe("selectPetIntervention", () => {
  const overrunCtx = () =>
    runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      13 * 60
    );

  it("is silent when disabled", () => {
    expect(
      selectPetIntervention(overrunCtx(), { ...DEFAULT_PET_POLICY, enabled: false })
    ).toBeNull();
  });

  it("is silent during quiet hours", () => {
    const ctx = { ...overrunCtx(), minuteOfDay: 23 * 60 };
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY)).toBeNull();
  });

  it("shows the same key at most once per local day", () => {
    const ctx = overrunCtx();
    const first = selectPetIntervention(ctx, DEFAULT_PET_POLICY, []);
    expect(first).not.toBeNull();

    const history = recordPetIntervention([], first!, ctx);
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, history)).toBeNull();

    // A new day clears the cooldown.
    const tomorrow = { ...ctx, dateKey: "2023-11-15" };
    expect(selectPetIntervention(tomorrow, DEFAULT_PET_POLICY, history)).not.toBeNull();
  });

  it("lets risk bypass a spent channel budget", () => {
    const ctx = overrunCtx(); // estimate_overrun is severity "risk"
    // The warning channel is full and its 30m gap has not elapsed, but risk is
    // exempt from both — it only has to clear the collision gap.
    const history: PetInterventionRecord[] = [
      { key: "x", kind: "estimate_warning", severity: "warning", shownAt: T0 - 5 * MIN, dateKey: DATE_KEY },
      { key: "y", kind: "estimate_warning", severity: "warning", shownAt: T0 - 6 * MIN, dateKey: DATE_KEY },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, history)?.kind).toBe("estimate_overrun");
  });

  it("still holds risk back inside the collision gap", () => {
    // Otherwise two risk candidates fire on consecutive ticks and the first is
    // burned for the day after one second on screen.
    const ctx = overrunCtx();
    const history: PetInterventionRecord[] = [
      { key: "missing_rate:p1", kind: "missing_rate", severity: "risk", shownAt: T0 - 1000, dateKey: DATE_KEY },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, history)).toBeNull();
  });

  it("holds a warning back once its channel is spent", () => {
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      8 * 60
    ); // estimate_warning, severity "warning", maxPerDay 2
    const history: PetInterventionRecord[] = [
      { key: "x", kind: "estimate_warning", severity: "warning", shownAt: T0 - 90 * MIN, dateKey: DATE_KEY },
      { key: "y", kind: "estimate_warning", severity: "warning", shownAt: T0 - 80 * MIN, dateKey: DATE_KEY },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, history)).toBeNull();
  });

  it("holds a warning back inside the minimum gap", () => {
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      8 * 60
    );
    const recent: PetInterventionRecord[] = [
      { key: "x", kind: "estimate_warning", severity: "warning", shownAt: T0 - 5 * MIN, dateKey: DATE_KEY },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, recent)).toBeNull();

    const old: PetInterventionRecord[] = [
      { key: "x", kind: "estimate_warning", severity: "warning", shownAt: T0 - 45 * MIN, dateKey: DATE_KEY },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, old)).not.toBeNull();
  });

  it("ignores yesterday's history when budgeting today", () => {
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 10 })], projects: [project({ hourlyRate: 90 })] },
      8 * 60
    );
    const yesterday: PetInterventionRecord[] = [
      { key: "x", kind: "estimate_warning", severity: "warning", shownAt: T0 - 20 * 60 * MIN, dateKey: "2023-11-13" },
      { key: "y", kind: "estimate_warning", severity: "warning", shownAt: T0 - 21 * 60 * MIN, dateKey: "2023-11-13" },
    ];
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, yesterday)).not.toBeNull();
  });

  it("does not re-fire the same untouched stale draft on a new day", () => {
    const staleCtx = derivePetContext(
      input({
        sessions: [
          session({
            id: "stale-draft",
            state: "draft",
            endedAt: undefined,
            startedAt: T0 - 90 * MIN,
            frozenAt: T0 - 60 * MIN,
            durationSeconds: 30 * 60,
          }),
        ],
      })
    );
    const first = selectPetIntervention(staleCtx, DEFAULT_PET_POLICY, []);
    expect(first?.kind).toBe("stale_drafts");

    const history = recordPetIntervention([], first!, staleCtx);
    const tomorrow = { ...staleCtx, now: T0 + 24 * 60 * MIN, dateKey: "2023-11-15" };

    expect(selectPetIntervention(tomorrow, DEFAULT_PET_POLICY, history)).toBeNull();
  });

  it("says nothing when nothing is wrong", () => {
    const ctx = runningContext(
      { tasks: [task({ estimateMinutes: 60 })], projects: [project({ hourlyRate: 90 })] },
      10 * 60
    );
    expect(selectPetIntervention(ctx, DEFAULT_PET_POLICY, [])).toBeNull();
  });
});

// ─── History ─────────────────────────────────────────────────────────────────

describe("pet intervention history", () => {
  it("drops records older than seven days", () => {
    const history: PetInterventionRecord[] = [
      { key: "fresh", kind: "estimate_warning", severity: "warning", shownAt: T0 - MIN, dateKey: DATE_KEY },
      { key: "stale", kind: "estimate_warning", severity: "warning", shownAt: T0 - 8 * 24 * 60 * MIN, dateKey: "2023-11-06" },
    ];
    expect(prunePetHistory(history, T0).map((r) => r.key)).toEqual(["fresh"]);
  });

  it("retains stale-draft dedupe markers beyond seven days", () => {
    const history: PetInterventionRecord[] = [
      {
        key: "stale_drafts:1700000000000",
        kind: "stale_drafts",
        severity: "warning",
        shownAt: T0 - 30 * 24 * 60 * MIN,
        dateKey: "2023-10-15",
      },
    ];

    expect(prunePetHistory(history, T0)).toEqual(history);
  });

  it("caps the record count at 100, newest first", () => {
    const history: PetInterventionRecord[] = Array.from({ length: 150 }, (_, i) => ({
      key: `k${i}`,
      kind: "estimate_warning" as const,
      severity: "warning" as const,
      shownAt: T0 - i * MIN,
      dateKey: DATE_KEY,
    }));
    const pruned = prunePetHistory(history, T0);
    expect(pruned).toHaveLength(100);
    expect(pruned[0].key).toBe("k0");
  });

  it("records an outcome against the newest matching entry", () => {
    const history: PetInterventionRecord[] = [
      { key: "k", kind: "missing_rate", severity: "risk", shownAt: T0 - 10 * MIN, dateKey: DATE_KEY },
      { key: "k", kind: "missing_rate", severity: "risk", shownAt: T0 - MIN, dateKey: DATE_KEY },
    ];
    const resolved = resolvePetIntervention(history, "k", "dismissed", T0);
    expect(resolved[1].outcome).toBe("dismissed");
    expect(resolved[1].respondedAt).toBe(T0);
    expect(resolved[0].outcome).toBeUndefined();
  });

  it("leaves history untouched for an unknown key", () => {
    const history: PetInterventionRecord[] = [
      { key: "k", kind: "missing_rate", severity: "risk", shownAt: T0, dateKey: DATE_KEY },
    ];
    expect(resolvePetIntervention(history, "missing", "acted", T0)).toBe(history);
  });
});
