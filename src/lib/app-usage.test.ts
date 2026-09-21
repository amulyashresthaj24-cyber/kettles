import { describe, expect, it } from "vitest";
import {
  aggregateAppUsage,
  displayNameForExe,
  filterSpansBySessionIds,
  type AppUsageSpan,
} from "./app-usage";

const T0 = 1_700_000_000_000;

function span(partial: Partial<AppUsageSpan> & Pick<AppUsageSpan, "exe" | "sessionId">): AppUsageSpan {
  return {
    startedAt: T0,
    endedAt: T0 + 60_000,
    ...partial,
  };
}

describe("displayNameForExe", () => {
  it("maps known executables to a friendly name", () => {
    expect(displayNameForExe("Code.exe")).toBe("VS Code");
    expect(displayNameForExe("chrome.exe")).toBe("Chrome");
    expect(displayNameForExe("CURSOR.EXE")).toBe("Cursor");
  });

  it("strips .exe from unknown names", () => {
    expect(displayNameForExe("MyApp.exe")).toBe("MyApp");
    expect(displayNameForExe("weird")).toBe("weird");
  });

  it("treats a blank name as Unknown", () => {
    expect(displayNameForExe("  ")).toBe("Unknown");
  });
});

describe("filterSpansBySessionIds", () => {
  it("keeps only spans for the allowed sessions", () => {
    const spans = [
      span({ exe: "Code.exe", sessionId: "s1" }),
      span({ exe: "chrome.exe", sessionId: "s2" }),
      span({ exe: "slack.exe", sessionId: "s1" }),
    ];
    const kept = filterSpansBySessionIds(spans, new Set(["s1"]));
    expect(kept.map((s) => s.exe)).toEqual(["Code.exe", "slack.exe"]);
  });

  it("returns nothing when no sessions are allowed", () => {
    const spans = [span({ exe: "Code.exe", sessionId: "s1" })];
    expect(filterSpansBySessionIds(spans, new Set())).toEqual([]);
  });
});

describe("aggregateAppUsage", () => {
  it("sums seconds by exe, case-insensitive, and sorts by duration", () => {
    const slices = aggregateAppUsage([
      span({ exe: "Code.exe", sessionId: "s1", startedAt: T0, endedAt: T0 + 120_000 }),
      span({ exe: "code.exe", sessionId: "s2", startedAt: T0, endedAt: T0 + 60_000 }),
      span({ exe: "chrome.exe", sessionId: "s1", startedAt: T0, endedAt: T0 + 30_000 }),
    ]);
    expect(slices.map((s) => ({ name: s.name, seconds: s.seconds }))).toEqual([
      { name: "VS Code", seconds: 180 },
      { name: "Chrome", seconds: 30 },
    ]);
  });

  it("drops empty or zero-length spans", () => {
    const slices = aggregateAppUsage([
      span({ exe: " ", sessionId: "s1", startedAt: T0, endedAt: T0 + 10_000 }),
      span({ exe: "Code.exe", sessionId: "s1", startedAt: T0, endedAt: T0 }),
    ]);
    expect(slices).toEqual([]);
  });

  it("assigns a stable color per exe key", () => {
    const [first, second] = aggregateAppUsage([
      span({ exe: "Code.exe", sessionId: "s1" }),
      span({ exe: "chrome.exe", sessionId: "s1" }),
    ]);
    expect(first.color).toMatch(/^#/);
    expect(second.color).toMatch(/^#/);
    expect(first.color).not.toBe(second.color);
  });
});
