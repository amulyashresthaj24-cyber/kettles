"use client";

import { useState } from "react";
import { CaretDown, CheckCircle, Circle } from "@/components/ui/icon";
import { formatDuration, formatCurrency } from "@/lib/format";
import { budgetBarClass, budgetHealthStatus } from "@/lib/budget";
import { formatHourlyRate } from "@/lib/rates";
import { cn } from "@/lib/utils";
import type { ProjectRollup, ReportTotals } from "@/lib/report/data";
import { ReportEmptyState } from "./ReportCard";

const GRID = "grid grid-cols-[minmax(0,1fr)_110px_70px_110px_90px_110px_130px] items-center";

interface ProjectsTableProps {
  projects: ProjectRollup[];
  totals: ReportTotals;
  groupByClient?: boolean;
}

export function ProjectsTable({ projects, totals, groupByClient }: ProjectsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (projects.length === 0) {
    return <ReportEmptyState message="No sessions logged for this period." />;
  }

  const groups: { label: string | null; items: ProjectRollup[] }[] = groupByClient
    ? Array.from(
        projects.reduce((map, p) => {
          const key = p.clientName ?? "No client";
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
          return map;
        }, new Map<string, ProjectRollup[]>())
      ).map(([label, items]) => ({ label, items }))
    : [{ label: null, items: projects }];

  return (
    <div className="flex flex-col">
      <div
        className={cn(GRID, "px-5 py-2")}
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-mid)" }}
      >
        <HeaderCell>Project / Task</HeaderCell>
        <HeaderCell>Duration</HeaderCell>
        <HeaderCell>%</HeaderCell>
        <HeaderCell>Billable</HeaderCell>
        <HeaderCell>Rate</HeaderCell>
        <HeaderCell>Earnings</HeaderCell>
        <HeaderCell>Budget (period)</HeaderCell>
      </div>

      {groups.map((group) => (
        <div key={group.label ?? "_all"}>
          {group.label && (
            <div
              className="flex items-center justify-between px-5 py-2"
              style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--canvas)" }}
            >
              <span className="text-[12px] font-semibold text-text-secondary">{group.label}</span>
              <span className="text-[12px] tabular-nums text-text-muted">
                {formatDuration(group.items.reduce((a, p) => a + p.seconds, 0))}
              </span>
            </div>
          )}

          {group.items.map((proj) => {
            const pct = totals.totalSeconds > 0 ? ((proj.seconds / totals.totalSeconds) * 100).toFixed(1) : "0";
            const isExpanded = expandedRows.has(proj.id);
            return (
              <div key={proj.id}>
                <button
                  onClick={() => toggleRow(proj.id)}
                  className={cn(GRID, "w-full px-5 py-3 hover:bg-surface-mid transition-colors text-left")}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CaretDown
                      size={14}
                      className={cn(
                        "text-text-faint transition-transform duration-200 shrink-0",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                    <span className="text-[13px] font-medium text-text-primary truncate">{proj.name}</span>
                    <span className="text-[12px] text-text-faint shrink-0">({proj.tasks.length})</span>
                  </div>
                  <span className="text-[13px] tabular-nums text-text-secondary">{formatDuration(proj.seconds)}</span>
                  <span className="text-[13px] tabular-nums text-text-secondary">{pct}%</span>
                  <span className="text-[12px] text-text-muted tabular-nums">
                    {proj.billableSeconds > 0 ? formatDuration(proj.billableSeconds) : "–"}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] tabular-nums",
                      proj.rateSource === "client" ? "text-text-faint" : "text-text-muted"
                    )}
                    title={
                      proj.rateSource === "client"
                        ? "Inherited from the client rate"
                        : proj.rateSource === "project"
                          ? "Project rate"
                          : "No rate set"
                    }
                  >
                    {proj.hourlyRate > 0 ? formatHourlyRate(proj.hourlyRate) : "–"}
                  </span>
                  <span className="text-[13px] tabular-nums text-text-secondary">
                    {proj.earningsCents > 0 ? formatCurrency(proj.earningsCents) : "–"}
                  </span>
                  <BudgetCell budgetDollars={proj.budgetDollars} usedPct={proj.budgetUsedPct} />
                </button>

                {isExpanded &&
                  proj.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(GRID, "px-5 py-2.5")}
                      style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--canvas)" }}
                    >
                      <div className="flex items-center gap-3 pl-8 min-w-0">
                        {task.status === "done" ? (
                          <CheckCircle size={13} className="text-success shrink-0" />
                        ) : (
                          <Circle size={13} className="text-text-faint shrink-0" />
                        )}
                        <span className="text-[13px] text-text-secondary truncate">{task.title}</span>
                      </div>
                      <span className="text-[13px] tabular-nums text-text-muted">{formatDuration(task.seconds)}</span>
                      <span className="text-[13px] tabular-nums text-text-muted">
                        {totals.totalSeconds > 0 ? ((task.seconds / totals.totalSeconds) * 100).toFixed(1) : "0"}%
                      </span>
                      <span className="text-[12px] text-text-muted tabular-nums">
                        {task.billableSeconds > 0 ? formatDuration(task.billableSeconds) : "–"}
                      </span>
                      <span />
                      <span className="text-[13px] tabular-nums text-text-muted">
                        {task.earningsCents > 0 ? formatCurrency(task.earningsCents) : "–"}
                      </span>
                      <span />
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      ))}

      <div className={cn(GRID, "px-5 py-3")} style={{ background: "var(--surface-mid)" }}>
        <span className="text-[12px] uppercase tracking-[0.04em] font-semibold text-text-faint">Total</span>
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">
          {formatDuration(totals.totalSeconds)}
        </span>
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">100%</span>
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">
          {totals.billableSeconds > 0 ? formatDuration(totals.billableSeconds) : "–"}
        </span>
        <span />
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">
          {totals.earningsCents > 0 ? formatCurrency(totals.earningsCents) : "–"}
        </span>
        <span />
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.05em] text-text-faint font-medium">
      {children}
    </span>
  );
}

/**
 * Spend *in the filtered period* against the project's lifetime budget — not
 * budget health. A week-long filter on a nearly-exhausted budget shows a low
 * number here, correctly. Lifetime health lives on the project page
 * (`lifetimeBudgetHealth`) and on dashboard `BudgetAlerts`. The 80% warning
 * fill still applies so this cell does not stay green in that range.
 */
function BudgetCell({ budgetDollars, usedPct }: { budgetDollars?: number; usedPct?: number }) {
  if (!budgetDollars || usedPct === undefined) {
    return <span className="text-[12px] text-text-faint">–</span>;
  }
  const status = budgetHealthStatus(usedPct);
  const tone =
    status === "over" ? "text-error" : status === "warning" ? "text-warning" : "text-text-muted";
  return (
    <div className="flex flex-col gap-1 pr-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] tabular-nums", tone)}>
          {usedPct.toFixed(0)}%
        </span>
        <span className="text-[11px] text-text-faint tabular-nums">
          {formatCurrency(budgetDollars * 100)}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-mid)" }}>
        <div
          className={cn("h-full rounded-full", budgetBarClass(status))}
          style={{ width: `${Math.min(100, usedPct)}%` }}
        />
      </div>
    </div>
  );
}
