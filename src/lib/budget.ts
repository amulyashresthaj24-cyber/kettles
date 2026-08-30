// Lifetime project budget health. BillingPanel, report BudgetCell, and any
// warning copy must use these thresholds so 80–99% never reads as healthy.

/** Used-pct at which the UI switches from healthy to warning. Over-budget is 100%+. */
export const BUDGET_WARNING_PCT = 80;

export type BudgetHealthStatus = "ok" | "warning" | "over";

export function budgetHealthStatus(usedPct: number): BudgetHealthStatus {
  if (!Number.isFinite(usedPct)) return "ok";
  if (usedPct >= 100) return "over";
  if (usedPct >= BUDGET_WARNING_PCT) return "warning";
  return "ok";
}

/** Tailwind fill for the budget bar — warning range must not stay green. */
export function budgetBarClass(status: BudgetHealthStatus): string {
  if (status === "over") return "bg-error";
  if (status === "warning") return "bg-warning";
  return "bg-success";
}

export interface LifetimeBudgetHealth {
  budgetDollars: number;
  spentDollars: number;
  remainingDollars: number;
  usedPct: number;
  /** Hours still covered by remaining dollars at the effective rate; 0 when over. */
  hoursLeft: number | null;
  status: BudgetHealthStatus;
}

export function lifetimeBudgetHealth(opts: {
  budgetDollars: number;
  earnedCents: number;
  dollarsPerHour: number;
}): LifetimeBudgetHealth | null {
  const { budgetDollars, earnedCents, dollarsPerHour } = opts;
  if (!Number.isFinite(budgetDollars) || budgetDollars <= 0) return null;

  const spentDollars = Number.isFinite(earnedCents) ? Math.max(0, earnedCents / 100) : 0;
  const remainingDollars = budgetDollars - spentDollars;
  const usedPct = (spentDollars / budgetDollars) * 100;
  const hoursLeft =
    Number.isFinite(dollarsPerHour) && dollarsPerHour > 0
      ? Math.max(0, remainingDollars) / dollarsPerHour
      : null;

  return {
    budgetDollars,
    spentDollars,
    remainingDollars,
    usedPct,
    hoursLeft,
    status: budgetHealthStatus(usedPct),
  };
}
