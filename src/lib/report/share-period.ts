// Timezone-aware period keys for report shares.
// Keys match report-dates.ts: "2026-W27" | "2026-07" | "2026"
// Boundaries are computed in the share owner's IANA timezone, then converted to UTC ms.

import type { SharePeriodMode } from "./share-types";

export interface SharePeriodRange {
  startMs: number;
  endMs: number;
  label: string;
  key: string;
  periodMode: SharePeriodMode;
}

const WEEK_RE = /^(\d{4})-W(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const YEAR_RE = /^(\d{4})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function getTzParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date(ms));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: get("weekday"),
  };
}

/** Convert a wall-clock datetime in `timeZone` to UTC epoch ms. */
export function zonedLocalToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  for (let i = 0; i < 3; i++) {
    const p = getTzParts(guess, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, ms);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const delta = wanted - asUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return guess;
}

function weekdayIndex(weekday: string): number {
  // Intl en-US short: Sun Mon Tue Wed Thu Fri Sat
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

/** ISO week number for a local y-m-d in the given timezone. */
function isoWeekFromLocal(year: number, month: number, day: number, timeZone: string) {
  // Use Thursday of the ISO week to determine ISO year/week (UTC calendar math on local YMD).
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { year: isoYear, week };
}

function mondayOfIsoWeek(isoYear: number, week: number, timeZone: string): { y: number; m: number; d: number } {
  // Jan 4 is always in ISO week 1. Find that week's Monday in the timezone by searching.
  const jan4Ms = zonedLocalToUtcMs(isoYear, 1, 4, 12, 0, 0, 0, timeZone);
  const p = getTzParts(jan4Ms, timeZone);
  const dow = weekdayIndex(p.weekday); // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const week1MondayMs = zonedLocalToUtcMs(p.year, p.month, p.day + monOffset, 12, 0, 0, 0, timeZone);
  // day+monOffset may overflow — re-read parts after constructing via ms
  const targetMs = week1MondayMs + (week - 1) * 7 * 86_400_000;
  const t = getTzParts(targetMs, timeZone);
  return { y: t.year, m: t.month, d: t.day };
}

function shortDate(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function parsePeriodKey(
  periodMode: SharePeriodMode,
  periodKey: string
): { ok: true; year: number; week?: number; month?: number } | { ok: false; reason: string } {
  if (periodMode === "week") {
    const m = WEEK_RE.exec(periodKey);
    if (!m) return { ok: false, reason: "Invalid week key" };
    const year = Number(m[1]);
    const week = Number(m[2]);
    if (week < 1 || week > 53 || year < 2000 || year > 2100) return { ok: false, reason: "Week out of range" };
    return { ok: true, year, week };
  }
  if (periodMode === "month") {
    const m = MONTH_RE.exec(periodKey);
    if (!m) return { ok: false, reason: "Invalid month key" };
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12 || year < 2000 || year > 2100) return { ok: false, reason: "Month out of range" };
    return { ok: true, year, month };
  }
  const m = YEAR_RE.exec(periodKey);
  if (!m) return { ok: false, reason: "Invalid year key" };
  const year = Number(m[1]);
  if (year < 2000 || year > 2100) return { ok: false, reason: "Year out of range" };
  return { ok: true, year };
}

export function resolveSharePeriod(
  periodMode: SharePeriodMode,
  periodKey: string,
  timeZone: string
): SharePeriodRange | null {
  const parsed = parsePeriodKey(periodMode, periodKey);
  if (!parsed.ok) return null;

  try {
    if (periodMode === "week" && parsed.week != null) {
      const mon = mondayOfIsoWeek(parsed.year, parsed.week, timeZone);
      const startMs = zonedLocalToUtcMs(mon.y, mon.m, mon.d, 0, 0, 0, 0, timeZone);
      const sunParts = getTzParts(startMs + 6 * 86_400_000 + 12 * 3_600_000, timeZone);
      const endMs = zonedLocalToUtcMs(sunParts.year, sunParts.month, sunParts.day, 23, 59, 59, 999, timeZone);
      return {
        startMs,
        endMs,
        label: `${shortDate(mon.y, mon.m, mon.d)} – ${shortDate(sunParts.year, sunParts.month, sunParts.day)}`,
        key: periodKey,
        periodMode,
      };
    }

    if (periodMode === "month" && parsed.month != null) {
      const y = parsed.year;
      const m = parsed.month;
      const startMs = zonedLocalToUtcMs(y, m, 1, 0, 0, 0, 0, timeZone);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const endMs = zonedLocalToUtcMs(y, m, lastDay, 23, 59, 59, 999, timeZone);
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      return { startMs, endMs, label, key: periodKey, periodMode };
    }

    const y = parsed.year;
    const startMs = zonedLocalToUtcMs(y, 1, 1, 0, 0, 0, 0, timeZone);
    const endMs = zonedLocalToUtcMs(y, 12, 31, 23, 59, 59, 999, timeZone);
    return { startMs, endMs, label: String(y), key: periodKey, periodMode };
  } catch {
    return null;
  }
}

/** Build period key for "current" period in a timezone (for default viewer load). */
export function currentPeriodKey(periodMode: SharePeriodMode, timeZone: string, now = Date.now()): string {
  const p = getTzParts(now, timeZone);
  if (periodMode === "year") return String(p.year);
  if (periodMode === "month") return `${p.year}-${pad2(p.month)}`;
  const { year, week } = isoWeekFromLocal(p.year, p.month, p.day, timeZone);
  return `${year}-W${pad2(week)}`;
}

export function shiftPeriodKey(
  periodMode: SharePeriodMode,
  periodKey: string,
  delta: number,
  timeZone: string
): string | null {
  const range = resolveSharePeriod(periodMode, periodKey, timeZone);
  if (!range) return null;
  // Midpoint of the period, then shift by approx period length
  const mid = range.startMs + (range.endMs - range.startMs) / 2;
  let shifted = mid;
  if (periodMode === "week") shifted = mid + delta * 7 * 86_400_000;
  else if (periodMode === "month") {
    const p = getTzParts(mid, timeZone);
    shifted = zonedLocalToUtcMs(p.year, p.month + delta, 15, 12, 0, 0, 0, timeZone);
  } else {
    const p = getTzParts(mid, timeZone);
    shifted = zonedLocalToUtcMs(p.year + delta, 6, 15, 12, 0, 0, 0, timeZone);
  }
  return currentPeriodKey(periodMode, timeZone, shifted);
}
