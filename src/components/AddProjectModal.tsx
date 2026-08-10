"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "@/lib/store-supabase";
import type { ProjectColor, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, CaretDown } from "@/components/ui/icon";
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "@/lib/constants";
import { ProjectIconPicker } from "./ProjectIconPicker";
import { ProjectBillingSection } from "./ProjectBillingSection";
import { ClientNameField } from "./ClientSelector";
import { parseRateInput } from "@/lib/rates";
import { findClientByNormalizedName } from "@/lib/clients";
import { useFocusTrap } from "@/lib/use-focus-trap";

const PROJECT_STATUSES: { label: string; value: ProjectStatus }[] = [
  { label: "Active",     value: "active" },
  { label: "Paused",     value: "paused" },
  { label: "Completed",  value: "completed" },
  { label: "Archived",   value: "archived" },
];

function PillSelect<T extends string>({
  value,
  onChange,
  options,
  icon,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T; bg?: string }[];
  icon: React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors"
      >
        {selected?.bg && <span className={cn("w-2 h-2 rounded-full shrink-0", selected.bg)} />}
        {!selected?.bg && <span className="text-text-muted">{icon}</span>}
        <span>{selected ? selected.label : label}</span>
        <CaretDown size={11} className="text-text-faint" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[160px] bg-surface-raised border border-border rounded-lg shadow-elevation-2 z-dropdown py-1 overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left",
                value === o.value
                  ? "text-text-primary bg-surface-mid"
                  : "text-text-secondary hover:bg-surface-mid hover:text-text-primary"
              )}
            >
              {o.bg && <span className={cn("w-2 h-2 rounded-full shrink-0", o.bg)} />}
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addProject = useApp((s) => s.addProject);
  const resolveProjectClientLink = useApp((s) => s.resolveProjectClientLink);
  const clients = useApp((s) => s.clients);
  const panelRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ProjectColor>(DEFAULT_PROJECT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_PROJECT_ICON);
  const [billable, setBillable] = useState(true);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [budget, setBudget] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [clientName, setClientName] = useState("");
  const selectedClient = useMemo(
    () => findClientByNormalizedName(clients, clientName),
    [clients, clientName]
  );

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setColor(DEFAULT_PROJECT_COLOR);
      setIcon(DEFAULT_PROJECT_ICON);
      setBillable(true);
      setStatus("active");
      setBudget("");
      setHourlyRate("");
      setClientName("");
      setError(null);
    }
  }, [open]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;

    const parsedRate = parseRateInput(hourlyRate);
    if (!parsedRate.ok) {
      setError(parsedRate.error);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const clientId = await resolveProjectClientLink({ clientName });
      await addProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        billable,
        status,
        budget: budget ? Number(budget) : null,
        hourlyRate: parsedRate.value,
        ...(clientId ? { clientId } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, color, icon, billable, status, budget, hourlyRate, clientName, addProject, resolveProjectClientLink, onClose]);

  // Escape and the focus trap come from useFocusTrap; this only adds the
  // Cmd/Ctrl+Enter submit shortcut.
  useFocusTrap({ active: open, containerRef: panelRef, onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-lg">
      <div
        className="absolute inset-0 bg-base/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div ref={panelRef} role="dialog" aria-modal="true" className="animate-modal-in relative w-full max-w-[560px] bg-surface-raised rounded-xl shadow-elevation-3 flex flex-col overflow-visible border border-border-subtle">
        <div className="flex items-center justify-between px-xl py-md border-b border-border-subtle">
          <h2 className="text-[13px] text-text-secondary font-medium">
            New project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-faint hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-md px-xl pt-xl pb-lg">
          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
          <div className="flex items-start gap-4">
            <ProjectIconPicker
              icon={icon}
              color={color}
              onChange={(newIcon, newColor) => { setIcon(newIcon); setColor(newColor); }}
            />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <input
                autoFocus
                className="w-full bg-transparent border-none outline-none text-[22px] font-semibold text-text-primary placeholder:text-text-faint leading-snug"
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <textarea
                rows={2}
                className="w-full resize-none bg-transparent border-none outline-none text-[14px] text-text-secondary placeholder:text-text-muted leading-relaxed"
                placeholder="Add description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <ProjectBillingSection
            billable={billable}
            onBillableChange={setBillable}
            hourlyRate={hourlyRate}
            onHourlyRateChange={setHourlyRate}
            budget={budget}
            onBudgetChange={setBudget}
            client={selectedClient}
          />
        </div>

        <div className="flex items-center justify-between gap-sm px-xl py-lg border-t border-border-subtle">
          <div className="flex items-center gap-sm flex-wrap">
            <PillSelect
              value={status}
              onChange={setStatus}
              options={PROJECT_STATUSES}
              icon={<div className="text-[12px]">Status</div>}
              label="Status"
            />

            <ClientNameField value={clientName} onChange={setClientName} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create project"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
