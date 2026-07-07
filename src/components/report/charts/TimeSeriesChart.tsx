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

interface TimeSeriesChartProps {
  data: TimeBucket[];
  height?: number;
}

/** Stacked billable / non-billable bars over the report period. */
export function TimeSeriesChart({ data, height = 220 }: TimeSeriesChartProps) {
  const chartData = data.map((b) => ({
    label: b.label,
    Billable: b.billableSeconds,
    "Non-billable": b.seconds - b.billableSeconds,
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
          minTickGap={16}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={hoursTick}
          width={48}
        />
        <Tooltip content={<DurationTooltip />} cursor={CURSOR_FILL} />
        <Bar dataKey="Billable" stackId="t" fill="var(--success)" radius={[0, 0, 0, 0]} />
        <Bar
          dataKey="Non-billable"
          stackId="t"
          fill="var(--text-faint)"
          fillOpacity={0.4}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
