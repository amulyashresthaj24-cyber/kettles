import { describe, expect, it } from "vitest";
import {
  BUDGET_WARNING_PCT,
  budgetBarClass,
  budgetHealthStatus,
  lifetimeBudgetHealth,
} from "./budget";

describe("BUDGET_WARNING_PCT", () => {
  it("is 80%", () => {
    expect(BUDGET_WARNING_PCT).toBe(80);
  });
});

describe("budgetHealthStatus", () => {
  it("is ok below the warning threshold", () => {
    expect(budgetHealthStatus(0)).toBe("ok");
    expect(budgetHealthStatus(79.9)).toBe("ok");
  });

  it("is warning from 80% up to but not including 100%", () => {
    expect(budgetHealthStatus(80)).toBe("warning");
    expect(budgetHealthStatus(99.9)).toBe("warning");
  });

  it("is over-budget at 100%+", () => {
    expect(budgetHealthStatus(100)).toBe("over");
    expect(budgetHealthStatus(140)).toBe("over");
  });
});

describe("budgetBarClass", () => {
  it("does not stay green in the warning range", () => {
    expect(budgetBarClass("ok")).toBe("bg-success");
    expect(budgetBarClass("warning")).toBe("bg-warning");
    expect(budgetBarClass("over")).toBe("bg-error");
  });
});

describe("lifetimeBudgetHealth", () => {
  it("returns null without a positive budget", () => {
    expect(
      lifetimeBudgetHealth({ budgetDollars: 0, earnedCents: 10_000, dollarsPerHour: 100 })
    ).toBeNull();
    expect(
      lifetimeBudgetHealth({ budgetDollars: -50, earnedCents: 10_000, dollarsPerHour: 100 })
    ).toBeNull();
  });

  it("reports spent, remaining, percent, and hours left", () => {
    // $800 of $1,000 at $100/hr → 80%, $200 remaining, 2h left.
    const health = lifetimeBudgetHealth({
      budgetDollars: 1000,
      earnedCents: 80_000,
      dollarsPerHour: 100,
    });
    expect(health).toMatchObject({
      budgetDollars: 1000,
      spentDollars: 800,
      remainingDollars: 200,
      usedPct: 80,
      hoursLeft: 2,
      status: "warning",
    });
  });

  it("zeros hours left once over budget", () => {
    const health = lifetimeBudgetHealth({
      budgetDollars: 1000,
      earnedCents: 120_000,
      dollarsPerHour: 100,
    });
    expect(health?.status).toBe("over");
    expect(health?.remainingDollars).toBe(-200);
    expect(health?.hoursLeft).toBe(0);
  });

  it("omits hours left when there is no rate", () => {
    const health = lifetimeBudgetHealth({
      budgetDollars: 1000,
      earnedCents: 20_000,
      dollarsPerHour: 0,
    });
    expect(health?.hoursLeft).toBeNull();
    expect(health?.status).toBe("ok");
  });
});
