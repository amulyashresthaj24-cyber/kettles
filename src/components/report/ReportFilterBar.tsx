"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, CaretDown, CaretLeft, CaretRight, CurrencyDollar, FolderOpen, Tag } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Client, Project } from "@/lib/types";
import type { BillableFilter } from "@/lib/report/data";

export type PeriodMode = "week" | "month" | "year";

export interface PeriodCursors {
  week: number;
  month: number;
  year: number;
}

export interface ReportFilterState {
  periodMode: PeriodMode;
  cursors: PeriodCursors;
  projectId: string | null;
  clientId: string | null;
  tag: string | null;
  billable: BillableFilter;
}

interface ReportFilterBarProps {
  state: ReportFilterState;
  onChange: (patch: Partial<ReportFilterState>) => void;
  periodLabel: string;
  projects: Project[];
  clients: Client[];
  tagOptions: string[];
}

const BILLABLE_LABELS: Record<BillableFilter, string> = {
  all: "Billable + non-billable",
  billable: "Billable only",
  "non-billable": "Non-billable only",
};

export function ReportFilterBar({
  state,
  onChange,
  periodLabel,
  projects,
  clients,
  tagOptions,
}: ReportFilterBarProps) {
  const { periodMode, cursors, projectId, clientId, tag, billable } = state;

  const handlePrev = () =>
    onChange({ cursors: { ...cursors, [periodMode]: cursors[periodMode] - 1 } });
  const handleNext = () =>
    onChange({ cursors: { ...cursors, [periodMode]: cursors[periodMode] + 1 } });

  const hasFilters = projectId || clientId || tag || billable !== "all";
  const activeProjects = projects.filter((p) => !p.archived);

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-b border-border-subtle">
      {/* Period mode pills */}
      <div className="flex items-center gap-0 rounded-md border border-border bg-surface-raised overflow-hidden shrink-0">
        {(["week", "month", "year"] as PeriodMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onChange({ periodMode: m })}
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium transition-colors capitalize",
              periodMode === m
                ? "bg-surface-mid text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="flex items-center gap-0 rounded-md border border-border bg-surface-raised overflow-hidden shrink-0">
        <button
          onClick={handlePrev}
          className="px-2.5 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-mid transition-colors"
          aria-label="Previous period"
        >
          <CaretLeft size={14} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-x border-border min-w-[120px] justify-center">
          <span className="text-[13px] font-medium text-text-primary">{periodLabel}</span>
        </div>
        <button
          onClick={handleNext}
          className="px-2.5 py-1.5 text-text-muted hover:text-text-primary hover:bg-surface-mid transition-colors"
          aria-label="Next period"
        >
          <CaretRight size={14} />
        </button>
      </div>

      <FilterDropdown
        icon={<Briefcase size={13} />}
        placeholder="Client"
        value={clientId}
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        allLabel="All clients"
        onSelect={(v) => onChange({ clientId: v })}
      />

      <FilterDropdown
        icon={<FolderOpen size={13} />}
        placeholder="Project"
        value={projectId}
        options={activeProjects.map((p) => ({ value: p.id, label: p.name }))}
        allLabel="All projects"
        onSelect={(v) => onChange({ projectId: v })}
      />

      <FilterDropdown
        icon={<Tag size={13} />}
        placeholder="Tag"
        value={tag}
        options={tagOptions.map((t) => ({ value: t, label: t }))}
        allLabel="All tags"
        onSelect={(v) => onChange({ tag: v })}
      />

      <FilterDropdown
        icon={<CurrencyDollar size={13} />}
        placeholder="Billable"
        value={billable === "all" ? null : billable}
        options={[
          { value: "billable", label: "Billable only" },
          { value: "non-billable", label: "Non-billable only" },
        ]}
        allLabel={BILLABLE_LABELS.all}
        onSelect={(v) => onChange({ billable: (v ?? "all") as BillableFilter })}
        selectedLabel={billable !== "all" ? BILLABLE_LABELS[billable] : undefined}
      />

      {hasFilters && (
        <button
          className="text-[12px] text-error hover:opacity-80 shrink-0"
          onClick={() =>
            onChange({ projectId: null, clientId: null, tag: null, billable: "all" })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

interface FilterDropdownProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string | null;
  options: { value: string; label: string }[];
  allLabel: string;
  onSelect: (value: string | null) => void;
  /** Custom label to show when a value is selected (defaults to option label). */
  selectedLabel?: string;
}

function FilterDropdown({
  icon,
  placeholder,
  value,
  options,
  allLabel,
  onSelect,
  selectedLabel,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentLabel =
    value != null
      ? selectedLabel ?? options.find((o) => o.value === value)?.label ?? placeholder
      : placeholder;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] border transition-colors",
          value || open
            ? "border-accent/20 bg-accent/10 text-accent font-semibold"
            : "border-border-subtle bg-surface-mid/40 text-text-secondary hover:text-text-primary hover:bg-surface-mid/60"
        )}
      >
        {icon}
        <span className="max-w-[140px] truncate">{currentLabel}</span>
        <CaretDown size={11} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-surface-raised border border-border rounded-lg shadow-elevation-2 z-dropdown py-1">
          <button
            className={cn(
              "w-full text-left px-3 py-2 text-[12px] hover:bg-surface-mid transition-colors",
              value == null ? "text-accent font-medium" : "text-text-secondary"
            )}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          >
            {allLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              className={cn(
                "w-full text-left px-3 py-2 text-[12px] hover:bg-surface-mid transition-colors truncate",
                value === opt.value ? "text-accent font-medium" : "text-text-secondary"
              )}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-[12px] text-text-faint">Nothing to filter by yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
