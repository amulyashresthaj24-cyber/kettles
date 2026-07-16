"use client";

import { CheckCircle, Circle } from "@/components/ui/icon";
import { formatDuration, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimeLogRow } from "@/lib/report/data";
import { ReportEmptyState } from "./ReportCard";

const GRID = "grid grid-cols-[minmax(0,1fr)_130px_120px_150px_130px_80px_90px] items-center";

interface TimeLogTableProps {
  logs: TimeLogRow[];
  totalSeconds: number;
  totalEarningsCents: number;
  /** Insert a subtotal header row whenever the day changes (only sensible for date sorts). */
  groupByDay?: boolean;
}

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function TimeLogTable({ logs, totalSeconds, totalEarningsCents, groupByDay }: TimeLogTableProps) {
  if (logs.length === 0) {
    return (
      <ReportEmptyState message="No sessions logged for this period. Add an entry or start a focus session." />
    );
  }

  // Precompute per-day subtotals for group headers.
  const daySeconds = new Map<string, number>();
  if (groupByDay) {
    for (const log of logs) {
      const key = new Date(log.startedAt).toDateString();
      daySeconds.set(key, (daySeconds.get(key) ?? 0) + log.seconds);
    }
  }

  let lastDay: string | null = null;

  return (
    <div className="flex flex-col">
      <div
        className={cn(GRID, "px-5 py-2")}
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-mid)" }}
      >
        <HeaderCell>Task</HeaderCell>
        <HeaderCell>Project</HeaderCell>
        <HeaderCell>Client</HeaderCell>
        <HeaderCell>Tags</HeaderCell>
        <HeaderCell>Time</HeaderCell>
        <HeaderCell>Duration</HeaderCell>
        <HeaderCell>Earnings</HeaderCell>
      </div>

      {logs.map((log) => {
        const dayKey = new Date(log.startedAt).toDateString();
        const showDayHeader = groupByDay && dayKey !== lastDay;
        lastDay = dayKey;
        return (
          <div key={log.id}>
            {showDayHeader && (
              <div
                className="flex items-center justify-between px-5 py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--canvas)" }}
              >
                <span className="text-[12px] font-semibold text-text-secondary">
                  {fmtDate(log.startedAt)}
                </span>
                <span className="text-[12px] tabular-nums text-text-muted">
                  {formatDuration(daySeconds.get(dayKey) ?? 0)}
                </span>
              </div>
            )}
            <div
              className={cn(GRID, "px-5 py-3 hover:bg-surface-mid transition-colors")}
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                {log.taskStatus === "done" ? (
                  <CheckCircle size={13} className="text-success shrink-0" />
                ) : (
                  <Circle size={13} className="text-text-faint shrink-0" />
                )}
                <span className="text-[13px] text-text-primary truncate">{log.taskTitle}</span>
                {log.billable && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(16,185,129,0.12)] text-success">
                    $
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: log.color }} />
                <span className="text-[12px] text-text-secondary truncate">{log.projectName}</span>
              </div>
              <span className="text-[12px] text-text-muted truncate pr-2">{log.clientName}</span>
              <div className="flex items-center gap-1 flex-wrap pr-2 min-w-0">
                {log.tags.length === 0 ? (
                  <span className="text-[11px] text-text-faint">–</span>
                ) : (
                  log.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-mid text-text-secondary truncate max-w-[80px]"
                    >
                      {tag}
                    </span>
                  ))
                )}
                {log.tags.length > 3 && (
                  <span className="text-[10px] text-text-faint">+{log.tags.length - 3}</span>
                )}
              </div>
              <span className="text-[12px] text-text-muted tabular-nums">
                {fmtTime(log.startedAt)} – {fmtTime(log.endedAt)}
              </span>
              <span className="text-[13px] tabular-nums font-medium text-text-primary">
                {formatDuration(log.seconds)}
              </span>
              <span className="text-[13px] tabular-nums text-text-secondary">
                {log.earningsCents > 0 ? formatCurrency(log.earningsCents) : "–"}
              </span>
            </div>
          </div>
        );
      })}

      <div className={cn(GRID, "px-5 py-3")} style={{ background: "var(--surface-mid)" }}>
        <span className="text-[12px] font-semibold text-text-faint uppercase tracking-[0.04em]">Total</span>
        <span />
        <span />
        <span />
        <span />
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">
          {formatDuration(totalSeconds)}
        </span>
        <span className="text-[13px] tabular-nums font-semibold text-text-primary">
          {totalEarningsCents > 0 ? formatCurrency(totalEarningsCents) : "–"}
        </span>
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
