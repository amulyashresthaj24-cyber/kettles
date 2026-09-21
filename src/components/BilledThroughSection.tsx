"use client";

import { useState, useEffect } from "react";
import type { Client, Project, Session } from "@/lib/types";
import {
  billedTimelineLayout,
  formatBilledThroughLabel,
  formatBilledThroughShort,
  parseBilledThrough,
  summarizeProjectBilled,
  todayLocalDateString,
  toLocalDateString,
} from "@/lib/billed";
import { formatCurrency, formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarBlank } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface BilledThroughSectionProps {
  project: Project;
  client?: Client;
  sessions: Session[];
  onSave: (billedThrough: string | null) => Promise<void>;
}

function formatAxisDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function BilledThroughSection({
  project,
  client,
  sessions,
  onSave,
}: BilledThroughSectionProps) {
  const summary = summarizeProjectBilled(sessions, project, client);
  const layout = billedTimelineLayout(summary);
  const cutoff = parseBilledThrough(project.billedThrough);
  const [draft, setDraft] = useState(cutoff ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(cutoff ?? "");
  }, [cutoff]);

  const persist = async (next: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setDraft(next ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save billed-through date");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (raw: string) => {
    setDraft(raw);
    if (!raw) {
      void persist(null);
      return;
    }
    const parsed = parseBilledThrough(raw);
    if (!parsed) {
      setError("Pick a real calendar day");
      return;
    }
    void persist(parsed);
  };

  const label = formatBilledThroughLabel(cutoff);
  const lastEnded = summary.lastEndedAt
    ? toLocalDateString(new Date(summary.lastEndedAt))
    : null;

  return (
    <div className="space-y-md">
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">Already billed</p>
          <div className="mt-xs flex flex-wrap items-center gap-sm">
            {label ? (
              <Badge variant="success">{label}</Badge>
            ) : (
              <span className="text-sm text-text-primary">Nothing marked billed yet</span>
            )}
          </div>
        </div>
        {summary.unbilledBillableSeconds > 0 && (
          <div className="text-right">
            <p className="text-xs text-text-muted">Ready to invoice</p>
            <p className="mt-xs text-sm font-semibold tabular-nums text-text-primary">
              {formatDuration(summary.unbilledBillableSeconds)}
              {summary.unbilledEarningsCents > 0
                ? ` · ${formatCurrency(summary.unbilledEarningsCents)}`
                : ""}
            </p>
          </div>
        )}
      </div>

      {layout && (
        <BilledTimeline
          cutoffPct={layout.cutoffPct}
          startLabel={formatAxisDate(layout.startMs)}
          endLabel={formatAxisDate(layout.endMs)}
          cutoffLabel={formatBilledThroughShort(cutoff)}
        />
      )}

      <div className="grid grid-cols-2 gap-md">
        <BilledStat
          label="Already billed"
          hours={formatDuration(summary.billedSeconds)}
          earnings={
            summary.billedEarningsCents > 0
              ? formatCurrency(summary.billedEarningsCents)
              : summary.billedSeconds > 0
                ? "No charge"
                : "—"
          }
          muted={!cutoff}
        />
        <BilledStat
          label="Not yet billed"
          hours={formatDuration(summary.unbilledSeconds)}
          earnings={
            summary.unbilledEarningsCents > 0
              ? formatCurrency(summary.unbilledEarningsCents)
              : summary.unbilledSeconds > 0
                ? "No charge"
                : "—"
          }
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.04em] text-text-faint">
          Billed through
        </span>
        <span className="flex h-9 items-center gap-1 rounded-[8px] bg-surface-raised px-3 text-[14px] transition-colors focus-within:ring-2 focus-within:ring-accent/40">
          <CalendarBlank size={14} className="text-text-muted" />
          <input
            type="date"
            aria-label="Last date already invoiced on this project"
            className="w-full bg-transparent text-[14px] text-text-primary outline-none"
            value={draft}
            max={todayLocalDateString()}
            disabled={saving}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-sm">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={() => handleDateChange(todayLocalDateString())}
        >
          Mark billed through today
        </Button>
        {lastEnded && lastEnded !== cutoff && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => handleDateChange(lastEnded)}
          >
            Through last session
          </Button>
        )}
        {cutoff && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => handleDateChange("")}
          >
            Clear
          </Button>
        )}
      </div>

      <p className={cn("text-xs leading-relaxed", error ? "text-error" : "text-text-muted")}>
        {error ??
          "Time on or before this date is already invoiced. Later sessions stay open until you move the cutoff."}
      </p>
    </div>
  );
}

function BilledStat({
  label,
  hours,
  earnings,
  muted,
}: {
  label: string;
  hours: string;
  earnings: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("min-w-0", muted && "opacity-60")}>
      <p className="text-[11px] uppercase tracking-[0.04em] text-text-faint">{label}</p>
      <p className="mt-xs text-sm font-semibold tabular-nums text-text-primary">{hours}</p>
      <p className="text-xs tabular-nums text-text-muted">{earnings}</p>
    </div>
  );
}

function BilledTimeline({
  cutoffPct,
  startLabel,
  endLabel,
  cutoffLabel,
}: {
  cutoffPct: number | null;
  startLabel: string;
  endLabel: string;
  cutoffLabel: string | null;
}) {
  const billedWidth = cutoffPct ?? 0;
  const openWidth = cutoffPct == null ? 100 : Math.max(0, 100 - billedWidth);

  return (
    <div className="space-y-sm">
      <div className="relative h-2.5 overflow-visible rounded-full bg-surface-mid">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {billedWidth > 0 && (
            <div
              className="h-full bg-success/70"
              style={{ width: `${billedWidth}%` }}
              title="Already billed"
            />
          )}
          {openWidth > 0 && (
            <div
              className="h-full bg-accent/70"
              style={{ width: `${openWidth}%` }}
              title="Not yet billed"
            />
          )}
        </div>
        {cutoffPct != null && (
          <span
            className="absolute top-1/2 z-10 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-primary"
            style={{ left: `${cutoffPct}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="relative h-4 text-[10px] text-text-faint">
        <span className="absolute left-0">{startLabel}</span>
        {cutoffPct != null && cutoffLabel && (
          <span
            className="absolute -translate-x-1/2 font-medium text-text-secondary"
            style={{ left: `${cutoffPct}%` }}
          >
            {cutoffLabel}
          </span>
        )}
        <span className="absolute right-0">{endLabel}</span>
      </div>
      <div className="flex items-center gap-md text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
          Already billed
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
          Not yet billed
        </span>
      </div>
    </div>
  );
}
