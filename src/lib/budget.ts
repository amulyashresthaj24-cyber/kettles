/**
 * Project budget health.
 *
 * A budget is a property of the whole project, not of whatever window the
 * report happens to be filtered to. `ProjectRollup.budgetUsedPct` divides the
 * *period's* earnings by the *lifetime* budget, so filtering to "this week"
 * makes a nearly-exhausted budget look untouched. That number is still useful
 * as "spend in this period against the budget", but it must not be read as
 * budget health — this module is the one that answers that.
 *
 * Pure. No store, no network, no `Date.now()` — same rule as rates.ts.
 */

import { earningsCents, resolveHourlyRate } from "./rates";
import type { Client, Project, Session } from "./types";

/** Spend fraction at which a budget starts warning. */
export const BUDGET_WARNING_PCT = 80;

export type BudgetStatus = "none" | "ok" | "warning" | "over";

export interface BudgetHealth {
  /** The configured budget in dollars; 0 when unset. */
  budgetDollars: number;
  /** Lifetime billable earnings against this project, in cents. */
  spentCents: number;
  /** Budget minus spend, in cents. Negative once over. */
  remainingCents: number;
  /** Spend as a percentage of budget. Unbounded — 140 means 40% over. */
  usedPct: number;
  status: BudgetStatus;
  /** Billable seconds still affordable at the effective rate; null if no rate. */
  remainingSeconds: number | null;
}

export const NO_BUDGET: BudgetHealth = {
  budgetDollars: 0,
  spentCents: 0,
  remainingCents: 0,
  usedPct: 0,
  status: "none",
  remainingSeconds: null,
};

function isCountable(s: Session): boolean {
  // Same rule the report uses: only confirmed, ended sessions are money.
  return !!s.endedAt && (s.state ?? "confirmed") === "confirmed";
}

/**
 * Lifetime budget health for one project.
 *
 * Only billable time counts against a budget — non-billable work costs the
 * client nothing, so charging it to their budget would be wrong. Sessions are
 * priced with the same `resolveHourlyRate` chain the report uses, so the two
 * never disagree about what an hour was worth.
 */
export function projectBudgetHealth(
  project: Project | undefined | null,
  sessions: Session[],
  client?: Client | null
): BudgetHealth {
  const budgetDollars = typeof project?.budget === "number" ? project.budget : 0;
  if (!project || !Number.isFinite(budgetDollars) || budgetDollars <= 0) return NO_BUDGET;

  const rate = resolveHourlyRate(project, client);

  let spentCents = 0;
  for (const s of sessions) {
    if (s.projectId !== project.id) continue;
    if (!isCountable(s)) continue;
    if (!s.billable) continue;
    spentCents += earningsCents(s.durationSeconds ?? 0, rate.dollarsPerHour, true);
  }

  const budgetCents = Math.round(budgetDollars * 100);
  const remainingCents = budgetCents - spentCents;
  const usedPct = (spentCents / budgetCents) * 100;

  return {
    budgetDollars,
    spentCents,
    remainingCents,
    usedPct,
    status: usedPct >= 100 ? "over" : usedPct >= BUDGET_WARNING_PCT ? "warning" : "ok",
    // Hours left is the number people actually act on; without a rate there is
    // no conversion and guessing one would be worse than saying nothing.
    remainingSeconds:
      rate.dollarsPerHour > 0
        ? Math.max(0, Math.round((remainingCents / 100 / rate.dollarsPerHour) * 3600))
        : null,
  };
}

/** Health for every project that has a budget set, worst first. */
export function projectsNeedingAttention(
  projects: Project[],
  sessions: Session[],
  clients: Client[]
): Array<{ project: Project; health: BudgetHealth }> {
  const clientById = new Map(clients.map((c) => [c.id, c]));
  return projects
    .map((project) => ({
      project,
      health: projectBudgetHealth(
        project,
        sessions,
        project.clientId ? clientById.get(project.clientId) : undefined
      ),
    }))
    .filter(({ health }) => health.status === "warning" || health.status === "over")
    .sort((a, b) => b.health.usedPct - a.health.usedPct);
}

/** Short human line for a badge or a pet detail. */
export function describeBudget(health: BudgetHealth): string {
  switch (health.status) {
    case "over":
      return `${(health.usedPct - 100).toFixed(0)}% over budget`;
    case "warning":
      return `${health.usedPct.toFixed(0)}% of budget used`;
    case "ok":
      return `${health.usedPct.toFixed(0)}% of budget used`;
    default:
      return "No budget set";
  }
}
