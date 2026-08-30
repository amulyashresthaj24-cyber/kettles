"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store-supabase";
import { projectsNeedingAttention } from "@/lib/budget";
import { formatCurrency, formatDuration } from "@/lib/format";
import { Warning } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Budgets that are close to spent or already over.
 *
 * Renders nothing when every budget is healthy — a permanent "all good" panel
 * trains people to ignore the space, and then the one time it matters they miss
 * it. Archived projects are excluded: an archived budget is not actionable.
 *
 * The figures are lifetime (see lib/budget.ts), which is the only reading that
 * makes sense for a budget — deliberately not the report's period-scoped one.
 */
export function BudgetAlerts() {
  const projects = useApp((s) => s.projects);
  const sessions = useApp((s) => s.sessions);
  const clients = useApp((s) => s.clients);

  const flagged = useMemo(
    () =>
      projectsNeedingAttention(
        projects.filter((p) => p.status !== "archived" && !p.archivedAt),
        sessions,
        clients
      ),
    [projects, sessions, clients]
  );

  if (flagged.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-2"
      aria-label="Budget alerts"
    >
      {flagged.map(({ project, health }) => {
        const over = health.status === "over";
        return (
          <Link
            key={project.id}
            href={`/projects/view?id=${project.id}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors",
              "border",
              over
                ? "border-error-border bg-error-subtle hover:bg-error-subtle/80"
                : "border-warning-border bg-warning-subtle hover:bg-warning-subtle/80"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Warning
                size={16}
                className={cn("shrink-0", over ? "text-error" : "text-warning")}
                aria-hidden
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold text-text-primary truncate">
                  {project.name}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {over
                    ? `${formatCurrency(-health.remainingCents)} over a ${formatCurrency(health.budgetDollars * 100)} budget`
                    : `${formatCurrency(health.remainingCents)} left of ${formatCurrency(health.budgetDollars * 100)}`}
                  {health.remainingSeconds !== null && health.remainingSeconds > 0
                    ? ` · about ${formatDuration(health.remainingSeconds)} of billable work`
                    : ""}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "text-[13px] font-semibold tabular-nums shrink-0",
                over ? "text-error" : "text-warning"
              )}
            >
              {health.usedPct.toFixed(0)}%
            </span>
          </Link>
        );
      })}
    </section>
  );
}
