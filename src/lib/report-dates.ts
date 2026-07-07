// Shared date-range helpers for reporting. Weeks are ISO: Monday-first.
export const WEEK_STARTS_ON = 1;

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  /** Stable id for filenames/keys: "2026-W27" | "2026-07" | "2026" */
  key: string;
}

const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** ISO-8601 week number (week containing the first Thursday of the year). */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return { year: isoYear, week };
}

export function getWeekRange(offset: number, from: Date = new Date()): DateRange {
  const dayOfWeek = from.getDay(); // 0=Sun..6=Sat
  const monday = new Date(from);
  monday.setDate(from.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const { year, week } = isoWeek(monday);
  const label =
    offset === 0 ? "This week"
    : offset === -1 ? "Last week"
    : `${shortDate(monday)} – ${shortDate(sunday)}`;
  return { start: monday, end: sunday, label, key: `${year}-W${pad2(week)}` };
}

export function getMonthRange(offset: number, from: Date = new Date()): DateRange {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const label =
    offset === 0
      ? "This month"
      : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label, key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` };
}

export function getYearRange(year: number): DateRange {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const label = year === new Date().getFullYear() ? "This year" : String(year);
  return { start, end, label, key: String(year) };
}

/** Start-of-day Date for each day in the range (inclusive). */
export function eachDayOf(range: DateRange): Date[] {
  const days: Date[] = [];
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= range.end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** ISO weeks (Mon–Sun) intersecting the range, in order. */
export function eachWeekOf(range: DateRange): DateRange[] {
  const weeks: DateRange[] = [];
  let week = getWeekRange(0, range.start);
  while (week.start.getTime() <= range.end.getTime()) {
    weeks.push({ ...week, label: `${shortDate(week.start)} – ${shortDate(week.end)}` });
    week = getWeekRange(1, week.start);
  }
  return weeks;
}

/** Calendar months intersecting the range, in order. */
export function eachMonthOf(range: DateRange): DateRange[] {
  const months: DateRange[] = [];
  let month = getMonthRange(0, range.start);
  while (month.start.getTime() <= range.end.getTime()) {
    months.push({
      ...month,
      label: month.start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
    month = getMonthRange(1, month.start);
  }
  return months;
}

export function formatRangeForFilename(range: DateRange): string {
  return range.key.replace(/[^0-9A-Za-z-]/g, "-").toLowerCase();
}
