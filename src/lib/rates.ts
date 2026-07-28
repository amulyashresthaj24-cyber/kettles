// Single source of truth for billing rates and earnings math. The report
// pipeline, dashboard, project pages and exports all resolve rates here so a
// project rate always beats the client rate by exactly the same rule.

export type RateSource = "project" | "client" | "none";

export interface ResolvedRate {
  /** Dollars per hour used for earnings; 0 when no rate is set anywhere. */
  dollarsPerHour: number;
  source: RateSource;
  /** Client the rate was inherited from, when source is "client". */
  inheritedFrom?: string;
}

interface RateBearing {
  hourlyRate?: number | null;
}

interface NamedRateBearing extends RateBearing {
  name?: string;
}

export const NO_RATE: ResolvedRate = { dollarsPerHour: 0, source: "none" };

/** Rates above this are treated as typos rather than real hourly rates. */
export const MAX_HOURLY_RATE = 100_000;

function positiveRate(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return null;
  return num;
}

export function resolveHourlyRate(
  project?: RateBearing | null,
  client?: NamedRateBearing | null
): ResolvedRate {
  const projectRate = positiveRate(project?.hourlyRate);
  if (projectRate != null) {
    return { dollarsPerHour: projectRate, source: "project" };
  }
  const clientRate = positiveRate(client?.hourlyRate);
  if (clientRate != null) {
    return { dollarsPerHour: clientRate, source: "client", inheritedFrom: client?.name };
  }
  return NO_RATE;
}

/** Non-billable time and unset rates both earn nothing. */
export function earningsCents(
  seconds: number,
  dollarsPerHour: number,
  billable = true
): number {
  if (!billable || dollarsPerHour <= 0 || seconds <= 0) return 0;
  return Math.round(dollarsPerHour * 100 * (seconds / 3600));
}

export type RateInputResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/** Blank input means "clear the rate" (null), not "keep the old one". */
export function parseRateInput(raw: string): RateInputResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return { ok: false, error: "Enter a number" };
  if (num < 0) return { ok: false, error: "Rate can't be negative" };
  if (num === 0) return { ok: true, value: null };
  if (num > MAX_HOURLY_RATE) return { ok: false, error: "That rate looks too high" };

  return { ok: true, value: Math.round(num * 100) / 100 };
}

export function formatHourlyRate(dollarsPerHour: number): string {
  const rounded = Math.round(dollarsPerHour * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${body}/hr`;
}

/** Short human label for where the effective rate comes from. */
export function describeRate(resolved: ResolvedRate): string {
  if (resolved.source === "none") return "No rate set";
  const rate = formatHourlyRate(resolved.dollarsPerHour);
  if (resolved.source === "client") {
    return resolved.inheritedFrom ? `${rate} from ${resolved.inheritedFrom}` : `${rate} from client`;
  }
  return rate;
}
