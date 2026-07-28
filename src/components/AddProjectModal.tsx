"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/lib/store-supabase";
import type { ProjectColor, ProjectStatus, Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, CaretDown, Plus } from "@/components/ui/icon";
import { Checkbox } from "./ui/checkbox";
import { Select } from "./ui/select";
import { PROJECT_COLOR_OPTIONS, DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "@/lib/constants";
import { ProjectIconPicker } from "./ProjectIconPicker";

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
        <div className="absolute bottom-full mb-2 left-0 min-w-[160px] bg-surface-raised border border-border rounded-lg shadow-2xl z-[60] py-1 overflow-hidden">
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
  const addClient = useApp((s) => s.addClient);
  const clients = useApp((s) => s.clients);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ProjectColor>(DEFAULT_PROJECT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_PROJECT_ICON);
  const [billable, setBillable] = useState(true);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [budget, setBudget] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [clientId, setClientId] = useState<string>("");

  // Inline client creation state
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientRate, setNewClientRate] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

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
      setClientId("");
      setIsAddingClient(false);
      setNewClientName("");
      setNewClientRate("");
      setClientError(null);
    }
  }, [open]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateClient = useCallback(async () => {
    if (!newClientName.trim()) {
      setClientError("Client name is required");
      return;
    }
    setClientError(null);
    try {
      const newClient = await addClient({
        name: newClientName.trim(),
        hourlyRate: newClientRate ? Number(newClientRate) : 0,
      });
      setClientId(newClient.id);
      setIsAddingClient(false);
      setNewClientName("");
      setNewClientRate("");
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Failed to create client");
    }
  }, [newClientName, newClientRate, addClient]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await addProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        billable,
        status,
        budget: budget ? Number(budget) : undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        clientId: clientId || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, color, icon, billable, status, budget, hourlyRate, clientId, addProject, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, handleSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-lg">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-modal-in relative w-full max-w-[560px] bg-surface-raised rounded-xl shadow-2xl flex flex-col overflow-visible border border-border-subtle">

        {/* Header */}
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

        {/* Body */}
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
        </div>

        {/* Footer pill row */}
        <div className="flex items-center justify-between gap-sm px-xl py-lg border-t border-border-subtle">
          <div className="flex items-center gap-sm flex-wrap">

            {/* Status */}
            <PillSelect
              value={status}
              onChange={setStatus}
              options={PROJECT_STATUSES}
              icon={<div className="text-[12px]">Status</div>}
              label="Status"
            />

            {/* Budget */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors cursor-text">
              <span className="text-text-muted">$</span>
              <input
                type="number"
                min="0"
                placeholder="Budget"
                className="bg-transparent border-none outline-none w-[60px] text-[12px] text-text-secondary placeholder:text-text-muted"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>

            {/* Project hourly rate for earnings */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors cursor-text">
              <span className="text-text-muted">$/hr</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Rate"
                className="bg-transparent border-none outline-none w-[56px] text-[12px] text-text-secondary placeholder:text-text-muted"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </label>

            {/* Billable toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors cursor-pointer">
              <Checkbox
                checked={billable}
                onChange={(checked) => setBillable(checked)}
                size="sm"
              />
              <span>Billable</span>
            </label>

            {/* Client selector */}
            {isAddingClient ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-accent/30">
                <input
                  type="text"
                  autoFocus
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateClient();
                    }
                    if (e.key === "Escape") {
                      setIsAddingClient(false);
                      setClientError(null);
                    }
                  }}
                  className="bg-transparent border-none outline-none w-[100px] text-[12px] text-text-primary placeholder:text-text-muted"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={newClientRate}
                  onChange={(e) => setNewClientRate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateClient();
                    }
                  }}
                  className="bg-transparent border-none outline-none w-[60px] text-[12px] text-text-secondary placeholder:text-text-muted"
                />
                <button
                  onClick={handleCreateClient}
                  className="text-accent hover:text-accent-hover"
                  title="Create client"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => {
                    setIsAddingClient(false);
                    setClientError(null);
                  }}
                  className="text-text-muted hover:text-text-primary"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Select
                value={clientId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "__new__") {
                    setIsAddingClient(true);
                    setClientId("");
                  } else {
                    setClientId(value);
                  }
                }}
                variant="pill"
                size="sm"
              >
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
                <option value="__new__">+ Add new client...</option>
              </Select>
            )}
            {clientError && (
              <span className="text-[11px] text-error ml-1">{clientError}</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
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
