"use client";

import { formatDuration } from "@/lib/format";

export const TICK_STYLE = { fill: "var(--text-faint)", fontSize: 10 } as const;
export const GRID_STROKE = "var(--border-subtle)";
export const CURSOR_FILL = { fill: "var(--surface-mid)", opacity: 0.45 } as const;

/** Axis formatter for values stored in seconds. */
export function hoursTick(v: number): string {
  const h = v / 3600;
  if (h === 0) return "0h";
  return h >= 10 || Number.isInteger(h) ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

export interface DurationTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

/** Recharts tooltip for series whose values are seconds. */
export function DurationTooltip({ active, payload, label }: DurationTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entries = payload.filter((p) => typeof p.value === "number" && p.value > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((a, p) => a + (p.value as number), 0);
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 shadow-elevation-2">
      {label !== undefined && (
        <div className="text-[11px] font-medium text-text-muted mb-1">{label}</div>
      )}
      {entries.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px] text-text-primary">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-text-secondary">{p.name}</span>
          <span className="ml-auto pl-3 tabular-nums font-medium">
            {formatDuration(p.value as number)}
          </span>
        </div>
      ))}
      {entries.length > 1 && (
        <div className="flex items-center gap-2 text-[12px] text-text-primary mt-1 pt-1 border-t border-border-subtle">
          <span className="text-text-secondary">Total</span>
          <span className="ml-auto pl-3 tabular-nums font-semibold">
            {formatDuration(total)}
          </span>
        </div>
      )}
    </div>
  );
}
