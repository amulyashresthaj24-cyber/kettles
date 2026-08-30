// Excel (.xlsx) report export. Consumes the exact ReportData the page renders,
// so exported numbers always match the UI. SheetJS is imported on demand.

import type { WorkBook, WorkSheet } from "xlsx";
import { formatDuration } from "@/lib/format";
import type { DateRange } from "@/lib/report-dates";
import { eachMonthOf, eachWeekOf, formatRangeForFilename } from "@/lib/report-dates";
import { BRAND_NAME, FILE_PREFIX } from "./constants";
import type { EnrichedSession, ReportData } from "./data";
import { buildTimeLog, computeTotals } from "./data";
import { saveLocalFile, type SaveLocalResult } from "./save-local";

export type ExportScope = "timesheet" | "current" | "by-project" | "by-month" | "by-week";

export const SCOPE_LABELS: Record<ExportScope, string> = {
  timesheet: "Timesheet",
  current: "Full report",
  "by-project": "By project",
  "by-month": "By month",
  "by-week": "By week",
};

type XlsxModule = typeof import("xlsx");

const CURRENCY_FMT = '"$"#,##0.00';
const HOURS_FMT = "0.00";

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;
const dollars = (cents: number) => Math.round(cents) / 100;

function describeFilters(data: ReportData): string {
  const parts: string[] = [];
  const f = data.filters;
  if (f.projectId) {
    const name = data.projects.find((p) => p.id === f.projectId)?.name;
    parts.push(`Project: ${name ?? f.projectId}`);
  }
  if (f.clientId) {
    const name = data.clients.find((c) => c.id === f.clientId)?.name;
    parts.push(`Client: ${name ?? f.clientId}`);
  }
  if (f.tag) parts.push(`Tag: ${f.tag}`);
  if (f.billable !== "all") parts.push(f.billable === "billable" ? "Billable only" : "Non-billable only");
  return parts.length > 0 ? parts.join(" · ") : "None";
}

/** Excel sheet names: max 31 chars, no : \ / ? * [ ], unique per workbook. */
function sheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = ` (${n++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate);
  return candidate;
}

interface SheetSpec {
  rows: (string | number | null)[][];
  /** Column widths in characters. */
  widths?: number[];
  /** column index → number format, applied to every numeric cell in that column. */
  formats?: Record<number, string>;
}

function makeSheet(XLSX: XlsxModule, spec: SheetSpec): WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(spec.rows);
  if (spec.widths) ws["!cols"] = spec.widths.map((wch) => ({ wch }));
  if (spec.formats) {
    for (let r = 0; r < spec.rows.length; r++) {
      for (const [colStr, fmt] of Object.entries(spec.formats)) {
        const c = Number(colStr);
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && cell.t === "n") cell.z = fmt;
      }
    }
  }
  return ws;
}

function summarySheet(data: ReportData, scope: ExportScope): SheetSpec {
  const t = data.totals;
  return {
    rows: [
      [`${BRAND_NAME} — Time Report`],
      [],
      ["Generated", new Date().toLocaleString("en-US")],
      ["Period", `${data.filters.range.label} (${data.filters.range.start.toLocaleDateString("en-US")} – ${data.filters.range.end.toLocaleDateString("en-US")})`],
      ["Scope", SCOPE_LABELS[scope]],
      ["Filters", describeFilters(data)],
      [],
      ["Metric", "Value", "Hours (decimal)"],
      ["Total time", formatDuration(t.totalSeconds), hours(t.totalSeconds)],
      ["Billable time", formatDuration(t.billableSeconds), hours(t.billableSeconds)],
      ["Non-billable time", formatDuration(t.nonBillableSeconds), hours(t.nonBillableSeconds)],
      ["Earnings (USD)", dollars(t.earningsCents), null],
      ["Billable %", `${t.billablePct.toFixed(1)}%`, null],
      ["Sessions", t.sessionCount, null],
      ["Active days", t.activeDays, null],
      ["Avg daily time", formatDuration(t.avgDailySeconds), hours(t.avgDailySeconds)],
      ["Avg session", formatDuration(t.avgSessionSeconds), hours(t.avgSessionSeconds)],
      ["Tasks completed", t.tasksCompleted, null],
      // Attribution rows appear only when an agent actually ran, so reports for
      // solo work do not carry three rows of zeros.
      ...(t.agentSeconds > 0
        ? ([
            ["AI-assisted time", formatDuration(t.agentSeconds), hours(t.agentSeconds)],
            ["Solo time", formatDuration(t.soloSeconds), hours(t.soloSeconds)],
            ["AI-assisted %", `${t.agentPct.toFixed(1)}%`, null],
            ["Sessions with AI", t.agentSessionCount, null],
          ] as (string | number | null)[][])
        : []),
    ],
    widths: [22, 30, 16],
    formats: { 1: CURRENCY_FMT, 2: HOURS_FMT },
  };
}

const PERIOD_HEADER = ["Period", "Hours", "Billable Hours", "Non-billable Hours", "Sessions", "Earnings (USD)"];

function periodRow(label: string, rows: EnrichedSession[]): (string | number)[] {
  const t = computeTotals(rows);
  return [label, hours(t.totalSeconds), hours(t.billableSeconds), hours(t.nonBillableSeconds), t.sessionCount, dollars(t.earningsCents)];
}

function dailySheet(data: ReportData): SheetSpec {
  return {
    rows: [
      ["Date", "Hours", "Billable Hours", "Non-billable Hours", "Earnings (USD)"],
      ...data.series.map((b) => [
        b.label,
        hours(b.seconds),
        hours(b.billableSeconds),
        hours(b.seconds - b.billableSeconds),
        dollars(b.earningsCents),
      ]),
    ],
    widths: [16, 12, 14, 18, 14],
    formats: { 1: HOURS_FMT, 2: HOURS_FMT, 3: HOURS_FMT, 4: CURRENCY_FMT },
  };
}

function subRangeSheet(data: ReportData, subRanges: DateRange[]): SheetSpec {
  return {
    rows: [
      PERIOD_HEADER,
      ...subRanges.map((r) =>
        periodRow(
          r.label,
          data.rows.filter((row) => row.endedAt >= r.start.getTime() && row.endedAt <= r.end.getTime())
        )
      ),
      periodRow("Total", data.rows),
    ],
    widths: [24, 12, 14, 18, 10, 14],
    formats: { 1: HOURS_FMT, 2: HOURS_FMT, 3: HOURS_FMT, 5: CURRENCY_FMT },
  };
}

function projectsSheet(data: ReportData): SheetSpec {
  return {
    rows: [
      ["Project", "Client", "Hours", "Billable Hours", "Sessions", "Tasks Completed", "Rate (USD/hr)", "Earnings (USD)", "Budget (USD)", "Budget Used % (this period)"],
      ...data.projects.map((p) => [
        p.name,
        p.clientName ?? "—",
        hours(p.seconds),
        hours(p.billableSeconds),
        p.sessionCount,
        p.tasksCompleted,
        p.hourlyRate > 0 ? p.hourlyRate : null,
        dollars(p.earningsCents),
        p.budgetDollars ?? null,
        p.budgetUsedPct !== undefined ? `${p.budgetUsedPct.toFixed(1)}%` : null,
      ]),
      [
        "Total",
        null,
        hours(data.totals.totalSeconds),
        hours(data.totals.billableSeconds),
        data.totals.sessionCount,
        data.totals.tasksCompleted,
        null,
        dollars(data.totals.earningsCents),
        null,
        null,
      ],
    ],
    widths: [28, 20, 10, 14, 10, 16, 14, 14, 14, 14],
    formats: { 2: HOURS_FMT, 3: HOURS_FMT, 6: CURRENCY_FMT, 7: CURRENCY_FMT, 8: CURRENCY_FMT },
  };
}

function tagsSheet(data: ReportData): SheetSpec {
  const total = data.totals.totalSeconds;
  return {
    rows: [
      ["Tag", "Hours", "Billable Hours", "% of Total", "Sessions", "Earnings (USD)"],
      ...data.tags.map((t) => [
        t.tag,
        hours(t.seconds),
        hours(t.billableSeconds),
        total > 0 ? `${((t.seconds / total) * 100).toFixed(1)}%` : "0%",
        t.sessionCount,
        dollars(t.earningsCents),
      ]),
    ],
    widths: [22, 10, 14, 12, 10, 14],
    formats: { 1: HOURS_FMT, 2: HOURS_FMT, 5: CURRENCY_FMT },
  };
}

/** 24h HH:mm to match client timesheet Excel. */
function fmtTime24(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Client timesheet layout: Date | From | To | Hours | Task | Description
 * Task = task title. Sorted oldest-first like the reference spreadsheet.
 */
function timesheetSheet(rows: EnrichedSession[]): SheetSpec {
  const logs = buildTimeLog(rows, "date_asc");
  return {
    rows: [
      ["Date", "From", "To", "Hours", "Task", "Description"],
      ...logs.map((l) => [
        new Date(l.startedAt).toLocaleDateString("en-US"),
        fmtTime24(l.startedAt),
        fmtTime24(l.endedAt),
        hours(l.seconds),
        l.taskTitle,
        l.description || "",
      ]),
    ],
    widths: [12, 8, 8, 10, 28, 48],
    formats: { 3: HOURS_FMT },
  };
}

function sessionsSheet(rows: EnrichedSession[]): SheetSpec {
  const logs = buildTimeLog(rows, "date_desc");
  return {
    rows: [
      ["Date", "Start", "End", "Task", "Project", "Client", "Tags", "Duration", "Hours (decimal)", "Billable", "Earnings (USD)"],
      ...logs.map((l) => [
        new Date(l.startedAt).toLocaleDateString("en-US"),
        new Date(l.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        new Date(l.endedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        l.taskTitle,
        l.projectName,
        l.clientName,
        l.tags.join(", "),
        formatDuration(l.seconds),
        hours(l.seconds),
        l.billable ? "Yes" : "No",
        dollars(l.earningsCents),
      ]),
    ],
    widths: [12, 10, 10, 32, 20, 18, 20, 10, 14, 9, 14],
    formats: { 8: HOURS_FMT, 10: CURRENCY_FMT },
  };
}

async function writeWorkbookLocal(
  XLSX: XlsxModule,
  wb: WorkBook,
  filename: string
): Promise<SaveLocalResult> {
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return saveLocalFile({
    filename,
    blob,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
    description: "Excel workbook",
  });
}

export async function exportExcel(
  data: ReportData,
  opts: { scope: ExportScope }
): Promise<SaveLocalResult> {
  const XLSX = await import("xlsx");
  const wb: WorkBook = XLSX.utils.book_new();
  const used = new Set<string>();
  const add = (name: string, spec: SheetSpec) =>
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, spec), sheetName(name, used));

  // Single-sheet client timesheet (Date / From / To / Hours / Task / Description)
  if (opts.scope === "timesheet") {
    add("Timesheet", timesheetSheet(data.rows));
    const filename = `${FILE_PREFIX}-timesheet-${formatRangeForFilename(data.filters.range)}.xlsx`;
    return writeWorkbookLocal(XLSX, wb, filename);
  }

  add("Summary", summarySheet(data, opts.scope));

  if (opts.scope === "by-month") {
    add("By Month", subRangeSheet(data, eachMonthOf(data.filters.range)));
  } else if (opts.scope === "by-week") {
    add("By Week", subRangeSheet(data, eachWeekOf(data.filters.range)));
  } else {
    add("Daily", dailySheet(data));
  }

  add("By Project", projectsSheet(data));
  add("By Tag", tagsSheet(data));
  add("Timesheet", timesheetSheet(data.rows));

  if (opts.scope === "by-project") {
    for (const p of data.projects) {
      const rows = data.rows.filter((r) => (r.project?.id ?? "_none") === p.id);
      add(p.name, sessionsSheet(rows));
    }
  } else {
    add("Sessions", sessionsSheet(data.rows));
  }

  const filename = `${FILE_PREFIX}-${opts.scope}-${formatRangeForFilename(data.filters.range)}.xlsx`;
  return writeWorkbookLocal(XLSX, wb, filename);
}
