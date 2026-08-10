"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, Trash, MagnifyingGlass, CalendarBlank, CheckCircle, Clock, Warning } from "@/components/ui/icon";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { useTaskArchive } from "@/lib/use-task-archive";
import { UrgencyDot } from "./UrgencyDot";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { ConfirmDialog } from "./ui/confirm-dialog";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

const STATUS_ICON = {
  todo: <Warning size={14} className="text-text-faint" />,
  doing: <Clock size={14} className="text-accent" />,
  done: <CheckCircle size={14} className="text-status-success" />,
} as const;

const STATUS_LABEL = {
  todo: "To Do",
  doing: "In Progress",
  done: "Done",
} as const;

export function TaskArchive({ tasks }: { tasks: Task[] }) {
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const runArchive = useTaskArchive();
  const deleteTask = useApp((s) => s.deleteTask);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"archivedAt" | "completedAt" | "urgency">("archivedAt");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((t) =>
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "archivedAt":
          return (b.archivedAt || 0) - (a.archivedAt || 0);
        case "completedAt":
          return (b.completedAt || 0) - (a.completedAt || 0);
        case "urgency":
          return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
        default:
          return 0;
      }
    });
  }, [tasks, searchQuery, sortBy]);

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg p-2xl text-center" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--border-subtle)" }}>
          <CalendarBlank size={22} className="text-text-faint" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[15px] font-semibold text-text-primary">Archive is empty</h3>
          <p className="text-[13px] text-text-muted max-w-[360px] leading-relaxed">
            Tasks you archive from the board will appear here. You can restore or permanently delete them at any time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-xl">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <CheckCircle size={17} className="text-accent" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-text-primary">
              {tasks.length} archived {tasks.length === 1 ? "task" : "tasks"}
            </h2>
            <p className="text-[12px] text-text-muted">
              Restore tasks to move them back to the board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="text"
              placeholder="Search archived tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface-raised border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent w-[240px]"
            />
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            size="sm"
          >
            <option value="archivedAt">Sort by: Archived date</option>
            <option value="completedAt">Sort by: Completed date</option>
            <option value="urgency">Sort by: Urgency</option>
          </Select>
        </div>
      </div>

      {/* Archive Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_100px_140px_120px_100px] gap-4 px-4 py-3 border-b text-xs font-medium text-text-faint uppercase tracking-wider" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-mid)" }}>
          <span>Task</span>
          <span>Project</span>
          <span>Status</span>
          <span>Urgency</span>
          <span>Archived</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {filteredTasks.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-text-muted">No archived tasks match &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[12px] text-accent hover:text-accent-hover transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const project = projects.find((p) => p.id === task.projectId);
              const client = project?.clientId
                ? clients.find((c) => c.id === project.clientId)
                : undefined;
              const isLast = index === filteredTasks.length - 1;

              return (
                <div
                  key={task.id}
                  className={`grid grid-cols-[1fr_120px_100px_140px_120px_100px] gap-4 px-4 py-3 items-center hover:bg-surface-raised transition-colors ${
                    !isLast ? "border-b border-border-subtle" : ""
                  }`}
                >
                  {/* Task Title */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {task.title}
                    </span>
                    {task.estimateMinutes && (
                      <span className="text-xs text-text-faint">
                        Estimated: {task.estimateMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Project */}
                  <div className="min-w-0">
                    {project ? (
                      <ProjectTag project={project} />
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    {STATUS_ICON[task.status]}
                    <span className="text-xs text-text-secondary">{STATUS_LABEL[task.status]}</span>
                  </div>

                  {/* Urgency */}
                  <div className="flex items-center gap-2">
                    <UrgencyDot urgency={task.urgency} size={7} />
                    <span className="text-xs text-text-secondary capitalize">{task.urgency}</span>
                  </div>

                  {/* Archived Date */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-text-secondary">
                      {formatDate(task.archivedAt)}
                    </span>
                    {task.completedAt && (
                      <span className="text-[10px] text-text-faint">
                        Completed: {formatDate(task.completedAt)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => runArchive(task, "restore")}
                      className="gap-1 text-text-faint hover:text-success"
                      title="Restore to board"
                      aria-label={`Restore ${task.title} to board`}
                    >
                      <ArrowClockwise size={13} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDeleteTarget(task)}
                      className="gap-1 text-text-faint hover:text-error"
                      title="Delete permanently"
                      aria-label={`Delete ${task.title} permanently`}
                    >
                      <Trash size={13} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>
          Showing {filteredTasks.length} of {tasks.length} archived tasks
        </span>
        <span>
          Tasks are automatically archived after completion
        </span>
      </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete archived task?"
        description={`This will permanently delete "${deleteTarget?.title ?? "this task"}". This action cannot be undone.`}
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            await deleteTask(deleteTarget.id);
            setDeleteTarget(null);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );
}
