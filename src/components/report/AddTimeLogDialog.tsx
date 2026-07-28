"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/icon";
import { useNotification } from "@/components/ui/notification";
import { useApp } from "@/lib/store-supabase";
import type { TimeLogRow } from "@/lib/report/data";
import { cn } from "@/lib/utils";

interface AddTimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefill project when a project filter is active. */
  defaultProjectId?: string | null;
  /** When set, dialog edits this log instead of creating. */
  editing?: TimeLogRow | null;
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

function dateInputFromTs(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function timeInputFromTs(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Combine local date (YYYY-MM-DD) + time (HH:mm) → epoch ms. */
function combineLocal(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}

/**
 * Build start/end from a single date field. If end time is earlier than start
 * (overnight), roll the end into the next calendar day.
 */
export function resolveEntryRange(dateStr: string, from: string, to: string) {
  const startedAt = combineLocal(dateStr, from);
  let endedAt = combineLocal(dateStr, to);
  if (endedAt < startedAt) {
    endedAt += 24 * 60 * 60 * 1000;
  }
  return { startedAt, endedAt };
}

export function AddTimeLogDialog({
  open,
  onClose,
  defaultProjectId,
  editing = null,
}: AddTimeLogDialogProps) {
  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);
  const addManualSession = useApp((s) => s.addManualSession);
  const updateManualSession = useApp((s) => s.updateManualSession);
  const { notify } = useNotification();
  const isEdit = !!editing;

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

  const projectTasks = useMemo(() => {
    const list = tasks.filter(
      (t) => t.projectId === projectId && !t.archived && !t.deletedAt
    );
    // Keep the currently linked task visible even if archived / project-mismatched,
    // otherwise the custom Select falls back to "Select task…".
    if (taskId) {
      const current = tasks.find((t) => t.id === taskId);
      if (current && !list.some((t) => t.id === current.id)) {
        return [current, ...list];
      }
    }
    return list;
  }, [tasks, projectId, taskId]);

  useEffect(() => {
    if (!open) return;
    const list = projects.filter((p) => !p.archived && p.status !== "archived");

    if (editing) {
      const linkedTask = editing.taskId
        ? tasks.find((t) => t.id === editing.taskId)
        : undefined;
      const pref =
        (editing.projectId &&
        (list.some((p) => p.id === editing.projectId) ||
          projects.some((p) => p.id === editing.projectId))
          ? editing.projectId
          : linkedTask?.projectId && list.some((p) => p.id === linkedTask.projectId)
            ? linkedTask.projectId
            : list[0]?.id) ?? "";
      setProjectId(pref);
      const hasTask = !!linkedTask;
      setTaskMode(hasTask ? "existing" : "new");
      setTaskId(hasTask ? linkedTask!.id : "");
      const rawTitle = hasTask ? linkedTask!.title : editing.taskTitle;
      setTaskTitle(rawTitle && rawTitle !== "Unknown task" ? rawTitle : "");
      setDate(dateInputFromTs(editing.startedAt));
      setFrom(timeInputFromTs(editing.startedAt));
      setTo(timeInputFromTs(editing.endedAt));
      setDescription(editing.description || "");
      setBillable(editing.billable);
      setError(null);
      return;
    }

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
  }, [open, defaultProjectId, projects, editing, tasks]);

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    setTaskId("");
    if (taskMode === "existing") setTaskTitle("");
    if (!isEdit) {
      const proj = projects.find((p) => p.id === id);
      if (proj) setBillable(proj.billable);
    }
  };

  const handleSelectExistingTask = (id: string) => {
    setTaskId(id);
    const t = tasks.find((x) => x.id === id);
    if (t) setTaskTitle(t.title);
  };

  const switchToNew = () => {
    setTaskMode("new");
    if (!taskTitle.trim()) {
      const t = taskId ? tasks.find((x) => x.id === taskId) : undefined;
      if (t) setTaskTitle(t.title);
      else if (editing?.taskTitle && editing.taskTitle !== "Unknown task") {
        setTaskTitle(editing.taskTitle);
      }
    }
  };

  const switchToExisting = () => {
    setTaskMode("existing");
    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      if (t && !taskTitle.trim()) setTaskTitle(t.title);
    }
  };

  const { startedAt, endedAt } = resolveEntryRange(date, from, to);
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
      setError("Enter a task title.");
      return;
    }
    if (taskMode === "existing" && !taskTitle.trim()) {
      setError("Enter a task name.");
      return;
    }
    if (endedAt <= startedAt) {
      setError("End time must be after start time.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        projectId,
        taskId: taskMode === "existing" ? taskId : undefined,
        taskTitle: taskTitle.trim() || undefined,
        startedAt,
        endedAt,
        billable,
        description: description.trim() || undefined,
      };

      const session = isEdit
        ? await updateManualSession(editing!.id, payload)
        : await addManualSession(payload);

      if (!session) {
        setError(isEdit ? "Could not update time entry." : "Could not save time entry. Try again.");
        return;
      }
      const label =
        taskTitle.trim() ||
        projectTasks.find((t) => t.id === taskId)?.title ||
        "task";
      notify({
        title: isEdit ? "Time entry updated" : "Time entry added",
        description: `${hoursDecimal}h · ${label}`,
        tone: "success",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time entry.");
    } finally {
      setBusy(false);
    }
  };

  // Include archived project in the select when editing an entry on it.
  const projectOptions = useMemo(() => {
    if (
      projectId &&
      !activeProjects.some((p) => p.id === projectId)
    ) {
      const orphan = projects.find((p) => p.id === projectId);
      if (orphan) return [orphan, ...activeProjects];
    }
    return activeProjects;
  }, [activeProjects, projects, projectId]);

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={isEdit ? "Edit time entry" : "Add time entry"}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <Field label="Project">
          <Select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full"
          >
            {projectOptions.length === 0 && <option value="">No projects</option>}
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived || p.status === "archived" ? " (archived)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Task</span>
            <div className="flex items-center gap-1 ml-auto">
              <ModeChip active={taskMode === "new"} onClick={switchToNew} label="New" />
              <ModeChip
                active={taskMode === "existing"}
                onClick={switchToExisting}
                label="Existing"
              />
            </div>
          </div>
          {taskMode === "new" ? (
            <Input
              placeholder="e.g. Design ideation"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus={!isEdit}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Select
                value={taskId}
                onChange={(e) => handleSelectExistingTask(e.target.value)}
                className="w-full"
              >
                <option value="">Select task…</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                    {t.archived ? " (archived)" : ""}
                  </option>
                ))}
              </Select>
              {taskId ? (
                <Input
                  placeholder="Task name"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  aria-label="Task name"
                />
              ) : null}
            </div>
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

        {error && <p className="text-[12px] text-error">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={busy} className="gap-1.5">
            {busy && <Spinner size={14} className="animate-spin" />}
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
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
