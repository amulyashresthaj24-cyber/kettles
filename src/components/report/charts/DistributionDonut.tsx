"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatDuration } from "@/lib/format";
import { DurationTooltip } from "./chart-theme";

export interface DonutSlice {
  id: string;
  name: string;
  seconds: number;
  color: string;
}

interface DistributionDonutProps {
  data: DonutSlice[];
  totalSeconds: number;
  /** Slices shown individually before collapsing the rest into "+N more". */
  maxSlices?: number;
}

const OTHERS_COLOR = "var(--text-faint)";

export function DistributionDonut({ data, totalSeconds, maxSlices = 6 }: DistributionDonutProps) {
  const top = data.slice(0, maxSlices);
  const rest = data.slice(maxSlices);
  const slices =
    rest.length > 0
      ? [
          ...top,
          {
            id: "_others",
            name: `+${rest.length} more`,
            seconds: rest.reduce((a, d) => a + d.seconds, 0),
            color: OTHERS_COLOR,
          },
        ]
      : top;

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="relative w-[160px] h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="seconds"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={slices.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {slices.map((s) => (
                <Cell key={s.id} fill={s.color} fillOpacity={s.id === "_others" ? 0.4 : 1} />
              ))}
            </Pie>
            <Tooltip content={<DurationTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[16px] font-bold tabular-nums tracking-[-0.02em] text-text-primary leading-none">
            {totalSeconds > 0 ? formatDuration(totalSeconds) : "–"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.06em] text-text-faint mt-0.5">
            Total
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {slices.map((s) => {
          const pct = totalSeconds > 0 ? ((s.seconds / totalSeconds) * 100).toFixed(1) : "0";
          return (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color, opacity: s.id === "_others" ? 0.5 : 1 }}
                />
                <span className="text-[12px] text-text-secondary truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] text-text-faint tabular-nums">
                  {formatDuration(s.seconds)}
                </span>
                <span className="text-[12px] text-text-muted tabular-nums w-10 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
        {slices.length === 0 && (
          <span className="text-[12px] text-text-muted text-center py-4">
            No time tracked in this period.
          </span>
        )}
      </div>
    </div>
  );
}
