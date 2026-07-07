"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TimeBucket } from "@/lib/report/data";
import { TICK_STYLE, GRID_STROKE, CURSOR_FILL, hoursTick, DurationTooltip } from "./chart-theme";

interface HourOfDayChartProps {
  data: TimeBucket[]; // 24 buckets, midnight → 11pm
  height?: number;
}

/** "When you work" — tracked time by session start hour. */
export function HourOfDayChart({ data, height = 180 }: HourOfDayChartProps) {
  const chartData = data.map((b) => ({ label: b.label, Tracked: b.seconds }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="18%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          interval={2}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={hoursTick}
          width={48}
        />
        <Tooltip content={<DurationTooltip />} cursor={CURSOR_FILL} />
        <Bar dataKey="Tracked" fill="var(--accent)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
