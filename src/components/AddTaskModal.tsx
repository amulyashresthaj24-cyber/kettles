"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/lib/store-supabase";
import type { Task, TaskStatus, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  X,
  Folder,
  Clock,
  ChartBar,
  CaretDown,
} from "@/components/ui/icon";
import { DatePicker } from "./DatePicker";

const URGENCY_OPTIONS: { label: string; value: Urgency; dot: string }[] = [
  { label: "Urgent",  value: "urgent", dot: "bg-red-500" },
  { label: "High",    value: "high",   dot: "bg-accent" },
  { label: "Normal",  value: "normal", dot: "bg-emerald-500" },
  { label: "Low",     value: "low",    dot: "bg-text-faint" },
];

type LegacyDateRange = string | { dueDate?: string | number; startDate?: string | number } | null | undefined;

function PillSelect<T extends string>({
  value,
  onChange,
  options,
  icon,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T; dot?: string }[];
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
        {selected?.dot && <span className={cn("w-2 h-2 rounded-full shrink-0", selected.dot)} />}
        {!selected?.dot && <span className="text-text-muted">{icon}</span>}
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
              {o.dot && <span className={cn("w-2 h-2 rounded-full shrink-0", o.dot)} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddTaskModal({
  open,
  onClose,
  defaultStatus = "todo",
  defaultProjectId,
  editingTask,
  defaultDateRange,
}: {
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
  editingTask?: Task | null;
  defaultDateRange?: string;
}) {
  const projects = useApp((s) => s.projects);
  const addTask = useApp((s) => s.addTask);
  const updateTask = useApp((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [estimate, setEstimate] = useState("");
  const [dateRange, setDateRange] = useState("");

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setTitle(editingTask.title || "");
        setDescription(editingTask.description || "");
        setProjectId(editingTask.projectId || "");
        setUrgency(editingTask.urgency || "normal");
        setEstimate(editingTask.estimateMinutes?.toString() || "");
        // Safely normalize dateRange: object legacy data -> string, string stays string
        const rawDate = editingTask.dateRange as LegacyDateRange;
        if (rawDate && typeof rawDate === "object") {
          if (rawDate.dueDate) {
            const d = new Date(rawDate.dueDate);
            setDateRange(isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]);
          } else if (rawDate.startDate) {
            const d = new Date(rawDate.startDate);
            setDateRange(isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]);
          } else {
            setDateRange("");
          }
        } else {
          setDateRange(typeof rawDate === "string" ? rawDate : "");
        }
      } else {
        setTitle("");
        setDescription("");
        setProjectId(defaultProjectId ?? "");
        setUrgency("normal");
        setEstimate("");
        setDateRange(defaultDateRange ?? "");
      }
    }
  }, [open, defaultProjectId, editingTask, defaultDateRange]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          projectId: projectId || null,
          urgency,
          estimateMinutes: estimate ? Number(estimate) : undefined,
          description: description.trim() || undefined,
          dateRange: typeof dateRange === "string" ? dateRange.trim() || undefined : undefined,
        });
      } else {
        await addTask({
          title: title.trim(),
          projectId: projectId || null,
          urgency,
          status: defaultStatus,
          estimateMinutes: estimate ? Number(estimate) : undefined,
          description: description.trim() || undefined,
          dateRange: typeof dateRange === "string" ? dateRange.trim() || undefined : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, projectId, urgency, estimate, dateRange, editingTask, addTask, updateTask, onClose, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, handleSubmit]);

  const projectOptions = [
    { label: "No project", value: "" },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

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

        {/* Breadcrumb header */}
        <div className="flex items-center justify-between px-xl py-md border-b border-border-subtle">
          <div className="flex items-center gap-sm text-[13px] text-text-muted">
            <Folder size={13} />
            <span>
              {projects.find((p) => p.id === projectId)?.name ?? "No project"}
            </span>
            <span className="text-text-faint">›</span>
            <span className="text-text-secondary font-medium">
              {editingTask ? "Edit task" : "New task"}
            </span>
          </div>
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
          <input
            autoFocus
            className="w-full bg-transparent border-none outline-none text-[22px] font-semibold text-text-primary placeholder:text-text-faint leading-snug"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            rows={3}
            className="w-full resize-none bg-transparent border-none outline-none text-[14px] text-text-secondary placeholder:text-text-muted leading-relaxed"
            placeholder="Add description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Footer pill row */}
        <div className="flex items-center justify-between gap-sm px-xl py-lg border-t border-border-subtle">
          <div className="flex items-center gap-sm flex-wrap">

            {/* Priority */}
            <PillSelect
              value={urgency}
              onChange={setUrgency}
              options={URGENCY_OPTIONS}
              icon={<ChartBar size={12} />}
              label="Priority"
            />

            {/* Project */}
            <PillSelect
              value={projectId}
              onChange={setProjectId}
              options={projectOptions}
              icon={<Folder size={12} />}
              label="Project"
            />

            {/* Estimate pill */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors cursor-text">
              <Clock size={12} className="text-text-muted shrink-0" />
              <input
                type="number"
                min="0"
                placeholder="Est time"
                className="bg-transparent border-none outline-none w-[50px] text-[12px] text-text-secondary placeholder:text-text-muted"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
              {estimate ? <span className="text-text-muted">min</span> : <span className="text-text-muted">minutes</span>}
            </label>

            {/* Date picker */}
            <DatePicker value={dateRange} onChange={setDateRange} />
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
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingTask ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
