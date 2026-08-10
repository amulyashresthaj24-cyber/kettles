import { describe, expect, it } from "vitest";
import { TIMELINE_VERSION } from "./session-timeline";
import {
  appendSegment,
  clampIdleSeconds,
  closeSegment,
  describeLiveAgents,
  describeRunFinish,
  listLiveAgentLines,
  draftFromRun,
  isManualAgentActive,
  listDetectedAgents,
  listLiveAgents,
  openSegment,
  summarizeLiveAgents,
  toMillis,
  type AgentRunStart,
} from "./agent-runs";
import type { AgentSegment } from "./types";

const T0 = 1_700_000_000_000; // fixed epoch — no Date.now() in assertions
const MIN = 60_000;

function start(partial: Partial<AgentRunStart> = {}): AgentRunStart {
  return {
    runId: "run-1",
    agent: "claude-code",
    label: "refactor sync-engine",
    ...partial,
  };
}

function seg(partial: Partial<AgentSegment> = {}): AgentSegment {
  return {
    runId: "run-1",
    agent: "claude-code",
    label: "refactor sync-engine",
    startedAt: T0,
    status: "running",
    ...partial,
  };
}

describe("openSegment / closeSegment", () => {
  it("opens then closes with correct startedAt/endedAt/status", () => {
    const opened = openSegment(start(), T0);
    expect(opened.startedAt).toBe(T0);
    expect(opened.status).toBe("running");
    expect(opened.endedAt).toBeUndefined();

    const closed = closeSegment(opened, "ok", T0 + 8 * MIN);
    expect(closed.startedAt).toBe(T0);
    expect(closed.endedAt).toBe(T0 + 8 * MIN);
    expect(closed.status).toBe("ok");
  });

  it("uses run.startedAt when provided", () => {
    const opened = openSegment(start({ startedAt: T0 - MIN }), T0);
    expect(opened.startedAt).toBe(T0 - MIN);
  });
});

describe("appendSegment (T6 / T7)", () => {
  it("does not duplicate on the same runId", () => {
    const a = closeSegment(openSegment(start(), T0), "ok", T0 + MIN);
    const b = closeSegment(
      openSegment(start({ label: "retry" }), T0),
      "error",
      T0 + 2 * MIN
    );
    const list = appendSegment(appendSegment([], a), b);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("error");
    expect(list[0].label).toBe("retry");
  });

  it("returns all segments when appending a second run (T7)", () => {
    const first = closeSegment(openSegment(start(), T0), "ok", T0 + MIN);
    const second = closeSegment(
      openSegment(start({ runId: "run-2", agent: "codex" }), T0 + MIN),
      "ok",
      T0 + 2 * MIN
    );
    const list = appendSegment(appendSegment([first], second), second);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.runId)).toEqual(["run-1", "run-2"]);
  });
});

describe("draftFromRun", () => {
  it("returns null under 60s", () => {
    const closed = closeSegment(seg(), "ok", T0 + 12_000);
    expect(draftFromRun(closed, T0 + 12_000)).toBeNull();
  });

  it("builds an agent_run draft over 60s with empty task", () => {
    const closed = closeSegment(seg(), "ok", T0 + 5 * MIN);
    const draft = draftFromRun(closed, T0 + 5 * MIN);
    expect(draft).not.toBeNull();
    expect(draft!.source).toBe("agent_run");
    expect(draft!.isDraft).toBe(true);
    expect(draft!.taskId).toBe("");
    expect(draft!.projectId).toBe("");
    expect(draft!.billable).toBe(false);
    expect(draft!.state).toBe("draft");
    expect(draft!.durationSeconds).toBe(5 * 60);
    expect(draft!.timelineVersion).toBe(TIMELINE_VERSION);
    expect(draft!.agentSegments?.[0].runId).toBe("run-1");
  });
});

describe("clampIdleSeconds (T3)", () => {
  it("reduces an OS idle reading that reaches past the lease end", () => {
    const leaseEnded = 1_700_000_000; // unix secs
    const now = leaseEnded + 120; // 2m later
    // OS reports 160m idle (agent + away), but only 2m since lease end
    expect(clampIdleSeconds(160 * 60, leaseEnded, now)).toBe(120);
  });

  it("passes through when no lease has ended", () => {
    expect(clampIdleSeconds(300, 0, 1_700_000_000)).toBe(300);
  });
});

describe("describeRunFinish", () => {
  it("states duration and labels stale runs honestly", () => {
    const ok = closeSegment(seg(), "ok", T0 + 8 * MIN);
    expect(describeRunFinish(ok)).toContain("8m");
    expect(describeRunFinish(ok)).toContain("Claude");

    const stale = closeSegment(seg(), "stale", T0 + 22 * MIN);
    expect(describeRunFinish(stale)).toMatch(/without reporting back/i);
  });
});

describe("toMillis", () => {
  it("converts unix seconds from the bridge", () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });
});

describe("summarizeLiveAgents (M2)", () => {
  it("summarizes one and many runs", () => {
    const one = { "run-1": seg({ status: "running" }) };
    expect(summarizeLiveAgents(one)).toMatch(/Claude/);
    expect(listLiveAgents(one)).toHaveLength(1);

    const many = {
      "run-1": seg({ status: "running" }),
      "run-2": seg({ runId: "run-2", agent: "codex", status: "running" }),
    };
    expect(summarizeLiveAgents(many)).toMatch(/running/);
    expect(listLiveAgents(many)).toHaveLength(2);
  });

  it("lists concurrent runs oldest first, each with its own clock", () => {
    const map = {
      newer: seg({
        runId: "newer",
        agent: "codex",
        label: "api",
        startedAt: T0 + 2 * MIN,
        status: "running",
      }),
      older: seg({
        runId: "older",
        agent: "claude-code",
        label: "kettles",
        startedAt: T0,
        status: "running",
      }),
      closed: seg({ runId: "closed", status: "ok" }),
    };
    const lines = listLiveAgentLines(map, T0 + 5 * MIN);

    expect(lines.map((l) => l.runId)).toEqual(["older", "newer"]);
    expect(lines[0].name).toBe("Claude");
    expect(lines[0].elapsedSeconds).toBe(300);
    expect(lines[1].name).toBe("Codex");
    expect(lines[1].elapsedSeconds).toBe(180);
    expect(lines.every((l) => l.manual === false)).toBe(true);
  });

  it("describeLiveAgents caps the line and counts the remainder", () => {
    const map: Record<string, AgentSegment> = {};
    for (let i = 0; i < 5; i++) {
      map[`run-${i}`] = seg({
        runId: `run-${i}`,
        label: `repo-${i}`,
        startedAt: T0 + i,
        status: "running",
      });
    }
    const line = describeLiveAgents(map, T0 + MIN);

    expect(line).toContain("repo-0");
    expect(line).toContain("repo-2");
    expect(line).not.toContain("repo-3");
    expect(line).toContain("+2 more");
    expect(describeLiveAgents({}, T0)).toBe("");
  });

  it("detects manual toggle", () => {
    expect(isManualAgentActive({})).toBe(false);
    expect(
      isManualAgentActive({
        manual: seg({ runId: "manual", agent: "manual", status: "running" }),
      })
    ).toBe(true);
  });

  it("listDetectedAgents excludes manual toggle", () => {
    const map = {
      manual: seg({ runId: "manual", agent: "manual", status: "running" }),
      "run-1": seg({ status: "running" }),
    };
    expect(listLiveAgents(map)).toHaveLength(2);
    expect(listDetectedAgents(map)).toHaveLength(1);
    expect(listDetectedAgents(map)[0].agent).toBe("claude-code");
  });
});
