"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/icon";
import { useNotification } from "@/components/ui/notification";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";

interface AddTimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefill project when a project filter is active. */
  defaultProjectId?: string | null;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function todayDateInput() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowTimeInput() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function minutesAgoTimeInput(mins: number) {
  const d = new Date(Date.now() - mins * 60_000);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Combine local date (YYYY-MM-DD) + time (HH:mm) → epoch ms. */
function combineLocal(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}

export function AddTimeLogDialog({ open, onClose, defaultProjectId }: AddTimeLogDialogProps) {
  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);
  const addManualSession = useApp((s) => s.addManualSession);
  const { notify } = useNotification();

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.archived && p.status !== "archived"),
    [projects]
  );

  const [projectId, setProjectId] = useState("");
  const [taskMode, setTaskMode] = useState<"existing" | "new">("new");
  const [taskId, setTaskId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [date, setDate] = useState(todayDateInput);
  const [from, setFrom] = useState(() => minutesAgoTimeInput(60));
  const [to, setTo] = useState(nowTimeInput);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId && !t.archived && !t.deletedAt),
    [tasks, projectId]
  );

  // Reset form when opened
  useEffect(() => {
    if (!open) return;
    const list = projects.filter((p) => !p.archived && p.status !== "archived");
    const pref =
      (defaultProjectId && list.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : list[0]?.id) ?? "";
    setProjectId(pref);
    setTaskMode("new");
    setTaskId("");
    setTaskTitle("");
    setDate(todayDateInput());
    setFrom(minutesAgoTimeInput(60));
    setTo(nowTimeInput());
    setDescription("");
    setError(null);
    const proj = list.find((p) => p.id === pref);
    setBillable(proj?.billable ?? true);
  }, [open, defaultProjectId, projects]);

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    setTaskId("");
    const proj = projects.find((p) => p.id === id);
    if (proj) setBillable(proj.billable);
  };

  const startedAt = combineLocal(date, from);
  const endedAt = combineLocal(date, to);
  const durationMin =
    endedAt > startedAt ? Math.round((endedAt - startedAt) / 60_000) : 0;
  const hoursDecimal =
    endedAt > startedAt ? Math.round(((endedAt - startedAt) / 3_600_000) * 100) / 100 : 0;

  const handleSave = async () => {
    setError(null);
    if (!projectId) {
      setError("Select a project.");
      return;
    }
    if (taskMode === "existing" && !taskId) {
      setError("Select a task.");
      return;
    }
    if (taskMode === "new" && !taskTitle.trim()) {
      setError("Enter a task title (Category).");
      return;
    }
    if (endedAt <= startedAt) {
      setError("End time must be after start time.");
      return;
    }

    setBusy(true);
    try {
      const session = await addManualSession({
        projectId,
        taskId: taskMode === "existing" ? taskId : undefined,
        taskTitle: taskMode === "new" ? taskTitle.trim() : undefined,
        startedAt,
        endedAt,
        billable,
        description: description.trim() || undefined,
      });
      if (!session) {
        setError("Could not save time entry. Try again.");
        return;
      }
      notify({
        title: "Time entry added",
        description: `${hoursDecimal}h logged for ${taskMode === "new" ? taskTitle.trim() : projectTasks.find((t) => t.id === taskId)?.title ?? "task"}.`,
        tone: "success",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add time entry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Add time entry" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <Field label="Project">
          <Select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full"
          >
            {activeProjects.length === 0 && <option value="">No projects</option>}
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Category (task)
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <ModeChip
                active={taskMode === "new"}
                onClick={() => setTaskMode("new")}
                label="New"
              />
              <ModeChip
                active={taskMode === "existing"}
                onClick={() => setTaskMode("existing")}
                label="Existing"
              />
            </div>
          </div>
          {taskMode === "new" ? (
            <Input
              placeholder="e.g. Design ideation"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
            />
          ) : (
            <Select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full"
            >
              <option value="">Select task…</option>
              {projectTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="From">
            <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-mid border border-border-subtle">
          <span className="text-[12px] text-text-muted">Duration</span>
          <span className="text-[13px] tabular-nums font-medium text-text-primary">
            {durationMin > 0 ? `${durationMin}m · ${hoursDecimal.toFixed(2)}h` : "—"}
          </span>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
            className={cn(
              "flex w-full rounded-[8px] bg-surface-mid px-3 py-2 text-[14px] text-text-primary font-sans",
              "placeholder:text-text-faint resize-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:bg-surface-raised"
            )}
          />
        </Field>

        <button
          type="button"
          onClick={() => setBillable((b) => !b)}
          className={cn(
            "self-start rounded-full px-3 py-1 text-[12px] font-medium border transition-colors",
            billable
              ? "border-success/40 bg-[rgba(16,185,129,0.12)] text-success"
              : "border-border-subtle text-text-muted hover:text-text-secondary"
          )}
        >
          {billable ? "$ Billable" : "Non-billable"}
        </button>

        {error && (
          <p className="text-[12px] text-error">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={busy} className="gap-1.5">
            {busy && <Spinner size={14} className="animate-spin" />}
            {busy ? "Saving…" : "Add entry"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function ModeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded-md text-[11px] border transition-colors",
        active
          ? "border-accent bg-accent-dim text-text-primary font-medium"
          : "border-border-subtle text-text-muted hover:text-text-secondary"
      )}
    >
      {label}
    </button>
  );
}
