import { cn } from "@/lib/utils";
import type { Urgency } from "@/lib/types";

const COLORS: Record<Urgency, string> = {
  urgent: "bg-[#DC2626]",
  high: "bg-accent",
  normal: "bg-[#16A34A]",
  low: "bg-[#808080]",
};

const LABELS: Record<Urgency, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export function UrgencyDot({ urgency, size = 8 }: { urgency: Urgency; size?: number }) {
  return (
    <span
      role="img"
      aria-label={`${LABELS[urgency]} urgency`}
      className={cn("inline-block rounded-full shrink-0", COLORS[urgency])}
      style={{ width: size, height: size }}
    />
  );
}

export const URGENCY_LABELS = LABELS;
