"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

export function KpiCard({ icon, label, value, sub, highlight }: KpiCardProps) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-2"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-muted font-medium">{label}</span>
        {icon}
      </div>
      <span
        className={cn(
          "text-[22px] font-semibold tabular-nums tracking-[-0.02em] leading-none",
          highlight ? "text-success" : "text-text-primary"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-text-faint">{sub}</span>}
    </div>
  );
}
