// Client-ready PDF report export. Consumes the exact ReportData the page
// renders. jspdf + jspdf-autotable are imported on demand.

import type { jsPDF } from "jspdf";
import { formatCurrency, formatDuration } from "@/lib/format";
import { formatRangeForFilename } from "@/lib/report-dates";
import { BRAND_NAME, FILE_PREFIX } from "./constants";
import type { EnrichedSession, ProjectRollup, ReportData } from "./data";
import { buildTimeLog, UNTAGGED } from "./data";
import type { ExportScope } from "./export-excel";
import { SCOPE_LABELS } from "./export-excel";

type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;

const PAGE_MARGIN = 40;
const ACCENT_RGB: [number, number, number] = [26, 116, 222];
const TEXT_DARK: [number, number, number] = [11, 18, 32];
const TEXT_MUTED: [number, number, number] = [88, 101, 119];
const HEAD_FILL: [number, number, number] = [238, 241, 246];

const TABLE_STYLES = {
  theme: "striped" as const,
  headStyles: { fillColor: HEAD_FILL, textColor: TEXT_DARK, fontSize: 8.5, fontStyle: "bold" },
  bodyStyles: { textColor: TEXT_DARK, fontSize: 9 },
  footStyles: { fillColor: HEAD_FILL, textColor: TEXT_DARK, fontSize: 9, fontStyle: "bold" },
  alternateRowStyles: { fillColor: [248, 249, 252] as [number, number, number] },
  margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 56 },
};

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 120;
}

function describeFilters(data: ReportData): string | null {
  const parts: string[] = [];
  const f = data.filters;
  if (f.clientId) {
    parts.push(data.clients.find((c) => c.id === f.clientId)?.name ?? "Client");
  }
  if (f.projectId) {
    parts.push(data.projects.find((p) => p.id === f.projectId)?.name ?? "Project");
  }
  if (f.tag) parts.push(`Tag: ${f.tag}`);
  if (f.billable !== "all") parts.push(f.billable === "billable" ? "Billable only" : "Non-billable only");
  return parts.length > 0 ? parts.join(" · ") : null;
}

function drawHeader(doc: jsPDF, data: ReportData, scope: ExportScope): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT_DARK);
  doc.text(BRAND_NAME, PAGE_MARGIN, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Time Report", PAGE_MARGIN, 68);

  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text(data.filters.range.label, pageWidth - PAGE_MARGIN, 52, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const filterLine = describeFilters(data);
  let rightY = 65;
  if (filterLine) {
    doc.text(filterLine, pageWidth - PAGE_MARGIN, rightY, { align: "right" });
    rightY += 12;
  }
  doc.text(
    `${SCOPE_LABELS[scope]} · Generated ${new Date().toLocaleDateString("en-US")}`,
    pageWidth - PAGE_MARGIN,
    rightY,
    { align: "right" }
  );

  doc.setDrawColor(...ACCENT_RGB);
  doc.setLineWidth(1.5);
  doc.line(PAGE_MARGIN, 84, pageWidth - PAGE_MARGIN, 84);
  return 84;
}

function drawKpiBlock(doc: jsPDF, data: ReportData, topY: number): number {
  const t = data.totals;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - PAGE_MARGIN * 2;
  const colW = usable / 3;
  const kpis: [string, string][] = [
    ["Total time", formatDuration(t.totalSeconds) || "0m"],
    ["Billable time", formatDuration(t.billableSeconds) || "0m"],
    ["Earnings", formatCurrency(t.earningsCents)],
    ["Active days", String(t.activeDays)],
    ["Avg daily", formatDuration(t.avgDailySeconds) || "0m"],
    ["Billable %", `${t.billablePct.toFixed(0)}%`],
  ];

  let y = topY + 26;
  kpis.forEach(([label, value], i) => {
    const col = i % 3;
    const x = PAGE_MARGIN + col * colW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, x, y + 16);
    if (col === 2 && i < kpis.length - 1) y += 40;
  });
  return y + 24;
}

function projectsTable(doc: jsPDF, autoTable: AutoTableFn, projects: ProjectRollup[], data: ReportData, startY: number): void {
  autoTable(doc, {
    ...TABLE_STYLES,
    startY,
    head: [["Project", "Client", "Hours", "Billable", "Sessions", "Earnings"]],
    body: projects.map((p) => [
      p.name,
      p.clientName ?? "—",
      formatDuration(p.seconds) || "0m",
      formatDuration(p.billableSeconds) || "—",
      String(p.sessionCount),
      p.earningsCents > 0 ? formatCurrency(p.earningsCents) : "—",
    ]),
    foot: [[
      "Total",
      "",
      formatDuration(data.totals.totalSeconds) || "0m",
      formatDuration(data.totals.billableSeconds) || "—",
      String(data.totals.sessionCount),
      data.totals.earningsCents > 0 ? formatCurrency(data.totals.earningsCents) : "—",
    ]],
  });
}

function tagsTable(doc: jsPDF, autoTable: AutoTableFn, data: ReportData, startY: number): void {
  const total = data.totals.totalSeconds;
  autoTable(doc, {
    ...TABLE_STYLES,
    startY,
    head: [["Tag", "Hours", "Billable", "% of total", "Earnings"]],
    body: data.tags.map((t) => [
      t.tag,
      formatDuration(t.seconds) || "0m",
      formatDuration(t.billableSeconds) || "—",
      total > 0 ? `${((t.seconds / total) * 100).toFixed(1)}%` : "0%",
      t.earningsCents > 0 ? formatCurrency(t.earningsCents) : "—",
    ]),
  });
}

function sessionsTable(doc: jsPDF, autoTable: AutoTableFn, rows: EnrichedSession[], startY: number): void {
  const logs = buildTimeLog(rows, "date_desc");
  autoTable(doc, {
    ...TABLE_STYLES,
    startY,
    bodyStyles: { ...TABLE_STYLES.bodyStyles, fontSize: 8 },
    headStyles: { ...TABLE_STYLES.headStyles, fontSize: 8 },
    head: [["Date", "Task", "Project", "Duration", "Billable", "Earnings"]],
    body: logs.map((l) => [
      new Date(l.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      l.taskTitle,
      l.projectName,
      formatDuration(l.seconds) || "0m",
      l.billable ? "Yes" : "No",
      l.earningsCents > 0 ? formatCurrency(l.earningsCents) : "—",
    ]),
  });
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(title, PAGE_MARGIN, y);
  return y + 12;
}

function drawFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      `Generated by ${BRAND_NAME} — ${new Date().toLocaleDateString("en-US")}`,
      PAGE_MARGIN,
      pageHeight - 24
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 24, {
      align: "right",
    });
  }
}

export async function exportPdf(data: ReportData, opts: { scope: ExportScope }): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const table = autoTable as unknown as AutoTableFn;

  const headerBottom = drawHeader(doc, data, opts.scope);
  let y = drawKpiBlock(doc, data, headerBottom);

  if (opts.scope === "by-project") {
    // One section per project: task table + session log.
    data.projects.forEach((p, i) => {
      if (i > 0) {
        doc.addPage();
        y = 56;
      }
      const sub = p.clientName ? `${p.name} — ${p.clientName}` : p.name;
      y = sectionTitle(doc, sub, y);
      table(doc, {
        ...TABLE_STYLES,
        startY: y + 4,
        head: [["Task", "Hours", "Billable", "Earnings"]],
        body: p.tasks.map((t) => [
          t.title,
          formatDuration(t.seconds) || "0m",
          formatDuration(t.billableSeconds) || "—",
          t.earningsCents > 0 ? formatCurrency(t.earningsCents) : "—",
        ]),
        foot: [[
          "Total",
          formatDuration(p.seconds) || "0m",
          formatDuration(p.billableSeconds) || "—",
          p.earningsCents > 0 ? formatCurrency(p.earningsCents) : "—",
        ]],
      });
      y = finalY(doc) + 24;
      y = sectionTitle(doc, "Sessions", y);
      sessionsTable(
        doc,
        table,
        data.rows.filter((r) => (r.project?.id ?? "_none") === p.id),
        y + 4
      );
      y = finalY(doc) + 32;
    });
  } else {
    y = sectionTitle(doc, "Projects", y);
    projectsTable(doc, table, data.projects, data, y + 4);
    y = finalY(doc) + 28;

    const meaningfulTags = data.tags.filter((t) => t.tag !== UNTAGGED);
    if (meaningfulTags.length > 0) {
      y = sectionTitle(doc, "Tags", y);
      tagsTable(doc, table, data, y + 4);
    }

    if (data.rows.length > 0) {
      doc.addPage();
      const appendixY = sectionTitle(doc, "Session log", 56);
      sessionsTable(doc, table, data.rows, appendixY + 4);
    }
  }

  drawFooters(doc);
  doc.save(`${FILE_PREFIX}-${opts.scope}-${formatRangeForFilename(data.filters.range)}.pdf`);
}
