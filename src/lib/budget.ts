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
 * Two layers, one set of thresholds:
 * - `lifetimeBudgetHealth` / `budgetHealthStatus` / `budgetBarClass` take
 *   already-computed spend (BillingPanel, report BudgetCell).
 * - `projectBudgetHealth` / `projectsNeedingAttention` aggregate sessions at
 *   the same rate chain the report uses (dashboard BudgetAlerts).
 *
 * Pure. No store, no network, no `Date.now()` — same rule as rates.ts.
 */

import { earningsCents, resolveHourlyRate } from "./rates";
import type { Client, Project, Session } from "./types";

/** Used-pct at which the UI switches from healthy to warning. Over-budget is 100%+. */
export const BUDGET_WARNING_PCT = 80;

export type BudgetHealthStatus = "ok" | "warning" | "over";

/** Includes "none" for aggregators that still return a row when no budget is set. */
export type BudgetStatus = "none" | BudgetHealthStatus;

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

function fromLifetime(health: LifetimeBudgetHealth): BudgetHealth {
  return {
    budgetDollars: health.budgetDollars,
    spentCents: Math.round(health.spentDollars * 100),
    remainingCents: Math.round(health.remainingDollars * 100),
    usedPct: health.usedPct,
    status: health.status,
    remainingSeconds:
      health.hoursLeft == null ? null : Math.round(health.hoursLeft * 3600),
  };
}

/**
 * Lifetime budget health for one project, derived from its sessions.
 *
 * Only billable time counts against a budget — non-billable work costs the
 * client nothing, so charging it to their budget would be wrong. Sessions are
 * priced with the same `resolveHourlyRate` chain the report uses, so the two
 * never disagree about what an hour was worth. Status and hours-left come from
 * `lifetimeBudgetHealth`, so the dashboard banner and the project page bar
 * cannot pick different thresholds.
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

  const health = lifetimeBudgetHealth({
    budgetDollars,
    earnedCents: spentCents,
    dollarsPerHour: rate.dollarsPerHour,
  });
  return health ? fromLifetime(health) : NO_BUDGET;
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
