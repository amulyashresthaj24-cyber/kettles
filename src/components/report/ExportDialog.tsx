"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FilePdf, FileXls, Spinner } from "@/components/ui/icon";
import { useNotification } from "@/components/ui/notification";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/report-dates";
import { getMonthRange, getWeekRange, getYearRange } from "@/lib/report-dates";
import type { ReportData } from "@/lib/report/data";
import type { ExportScope } from "@/lib/report/export-excel";

type ExportFormat = "pdf" | "excel";
type RangeChoice = "current" | "this-week" | "last-week" | "this-month" | "last-month" | "this-year";

const RANGE_PRESETS: { id: RangeChoice; label: string }[] = [
  { id: "current", label: "Current period" },
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "this-year", label: "This year" },
];

const SCOPES: { id: ExportScope; label: string; description: string; excelOnly?: boolean }[] = [
  {
    id: "timesheet",
    label: "Timesheet",
    description: "Date · From · To · Hours · Category · Description",
    excelOnly: true,
  },
  { id: "current", label: "Full report", description: "Summary, daily, projects, tags, and session log" },
  { id: "by-project", label: "By project", description: "A section / sheet per project" },
  { id: "by-month", label: "By month", description: "Totals broken down per month" },
  { id: "by-week", label: "By week", description: "Totals broken down per week" },
];

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Builds ReportData for the given range (null = current filter range). */
  getData: (range: DateRange | null) => ReportData;
}

export function ExportDialog({ open, onClose, getData }: ExportDialogProps) {
  const { notify } = useNotification();
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [scope, setScope] = useState<ExportScope>("timesheet");
  const [rangeChoice, setRangeChoice] = useState<RangeChoice>("current");
  const [busy, setBusy] = useState(false);

  const visibleScopes = SCOPES.filter((s) => format === "excel" || !s.excelOnly);

  const setExportFormat = (next: ExportFormat) => {
    setFormat(next);
    if (next === "pdf" && scope === "timesheet") setScope("current");
    if (next === "excel" && scope === "current") setScope("timesheet");
  };

  const resolveRange = (): DateRange | null => {
    switch (rangeChoice) {
      case "this-week": return getWeekRange(0);
      case "last-week": return getWeekRange(-1);
      case "this-month": return getMonthRange(0);
      case "last-month": return getMonthRange(-1);
      case "this-year": return getYearRange(new Date().getFullYear());
      default: return null;
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = getData(resolveRange());
      const result =
        format === "excel"
          ? await (await import("@/lib/report/export-excel")).exportExcel(data, { scope })
          : await (await import("@/lib/report/export-pdf")).exportPdf(data, { scope });

      if (!result.ok) {
        if (result.cancelled) {
          notify({ title: "Export cancelled", description: "No file was saved.", tone: "info" });
        } else {
          notify({ title: "Export failed", description: result.error, tone: "error" });
        }
        return;
      }

      notify({
        title: result.method === "picker" ? "Saved locally" : "Download started",
        description:
          result.method === "picker"
            ? `Saved ${result.filename}`
            : `${result.filename} — check your Downloads folder.`,
        tone: "success",
      });
      onClose();
    } catch (err) {
      console.error("Report export failed", err);
      notify({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Something went wrong generating the report.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Export report">
      <div className="flex flex-col gap-5">
        {/* Format */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-text-muted">Format</span>
          <div className="grid grid-cols-2 gap-2">
            <FormatCard
              icon={<FileXls size={20} className="text-success" />}
              label="Excel"
              description="Timesheet or full workbook"
              active={format === "excel"}
              onClick={() => setExportFormat("excel")}
            />
            <FormatCard
              icon={<FilePdf size={20} className="text-error" />}
              label="PDF"
              description="Client-ready summary"
              active={format === "pdf"}
              onClick={() => setExportFormat("pdf")}
            />
          </div>
        </div>

        {/* Scope */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-text-muted">
            {format === "excel" ? "Sheet layout" : "Breakdown"}
          </span>
          <div className="flex flex-col gap-1.5">
            {visibleScopes.map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors",
                  scope === s.id
                    ? "border-accent bg-accent-dim"
                    : "border-border-subtle hover:bg-surface-mid"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-text-primary">{s.label}</span>
                  <span className="text-[11px] text-text-muted">{s.description}</span>
                </div>
                <span
                  className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0",
                    scope === s.id ? "border-accent bg-accent" : "border-border"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Range */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-text-muted">Date range</span>
          <div className="flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRangeChoice(r.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] border transition-colors",
                  rangeChoice === r.id
                    ? "border-accent bg-accent-dim text-text-primary font-medium"
                    : "border-border-subtle text-text-muted hover:text-text-secondary hover:bg-surface-mid"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-text-faint leading-relaxed">
          You’ll pick a folder with the system Save dialog when available; otherwise the file goes to your Downloads folder.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={busy} className="gap-1.5">
            {busy && <Spinner size={14} className="animate-spin" />}
            {busy ? "Generating…" : `Save ${format === "excel" ? "Excel" : "PDF"}…`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FormatCard({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 px-3 py-3 rounded-lg border text-left transition-colors",
        active ? "border-accent bg-accent-dim" : "border-border-subtle hover:bg-surface-mid"
      )}
    >
      {icon}
      <span className="text-[13px] font-medium text-text-primary">{label}</span>
      <span className="text-[11px] text-text-muted">{description}</span>
    </button>
  );
}
