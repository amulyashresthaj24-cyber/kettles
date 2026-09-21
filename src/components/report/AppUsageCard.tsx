"use client";

import { formatDuration } from "@/lib/format";
import type { AppUsageSlice } from "@/lib/app-usage";
import { ReportCard, ReportEmptyState } from "@/components/report/ReportCard";
import { DistributionDonut } from "@/components/report/charts/DistributionDonut";

interface AppUsageCardProps {
  slices: AppUsageSlice[];
  trackingEnabled: boolean;
  title?: string;
  maxItems?: number;
  emptyWhenOn?: string;
}

export function AppUsageCard({
  slices,
  trackingEnabled,
  title = "Apps during timed sessions",
  maxItems = 8,
  emptyWhenOn = "No app activity in this period. It records while a timer is running.",
}: AppUsageCardProps) {
  const totalSeconds = slices.reduce((sum, s) => sum + s.seconds, 0);
  const donutData = slices.map((s) => ({
    id: s.id,
    name: s.name,
    seconds: s.seconds,
    color: s.color,
  }));

  return (
    <ReportCard title={title}>
      {totalSeconds <= 0 ? (
        <ReportEmptyState
          message={
            trackingEnabled
              ? emptyWhenOn
              : "Turn on Personal app activity in Settings → Timer & Theme."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DistributionDonut data={donutData} totalSeconds={totalSeconds} />
          <ul className="flex flex-col gap-1.5">
            {slices.slice(0, maxItems).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-text-primary truncate">{s.name}</span>
                </span>
                <span className="tabular-nums text-text-secondary shrink-0">{formatDuration(s.seconds)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-text-faint">
            Personal and local to this PC. Not billed, not included in exports or shared reports.
          </p>
        </div>
      )}
    </ReportCard>
  );
}
