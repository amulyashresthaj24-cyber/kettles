"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TimeBucket } from "@/lib/report/data";
import { TICK_STYLE, GRID_STROKE, CURSOR_FILL, hoursTick, DurationTooltip } from "./chart-theme";

interface WeekdayChartProps {
  data: TimeBucket[]; // 7 buckets, Monday-first
  height?: number;
}

/** Tracked time by day of week. Weekend bars (Sat/Sun) render muted. */
export function WeekdayChart({ data, height = 180 }: WeekdayChartProps) {
  const chartData = data.map((b, i) => ({
    label: b.label,
    Tracked: b.seconds,
    isWeekend: i >= 5, // Monday-first: 5 = Sat, 6 = Sun
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="25%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={hoursTick}
          width={48}
        />
        <Tooltip content={<DurationTooltip />} cursor={CURSOR_FILL} />
        <Bar dataKey="Tracked" radius={[3, 3, 0, 0]}>
          {chartData.map((d) => (
            <Cell
              key={d.label}
              fill="var(--accent)"
              fillOpacity={d.isWeekend ? 0.35 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
