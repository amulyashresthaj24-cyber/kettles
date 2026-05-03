"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Trash2, Search, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { UrgencyDot } from "./UrgencyDot";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { ConfirmDialog } from "./ui/confirm-dialog";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

const STATUS_ICON = {
  todo: <AlertCircle size={14} className="text-text-faint" />,
  doing: <Clock size={14} className="text-accent" />,
  done: <CheckCircle2 size={14} className="text-status-success" />,
} as const;

const STATUS_LABEL = {
  todo: "To Do",
  doing: "In Progress",
  done: "Done",
} as const;

export function TaskArchive({ tasks }: { tasks: Task[] }) {
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const restoreTask = useApp((s) => s.restoreTask);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-lg rounded-xl bg-surface p-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center">
          <Calendar size={24} className="text-text-faint" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium text-text-primary">No archived tasks</h3>
          <p className="text-sm text-text-muted max-w-md">
            Completed tasks are automatically archived after the day ends. Archived tasks appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-xl">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center">
            <CheckCircle2 size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-text-primary">Archived Tasks</h2>
            <p className="text-xs text-text-muted">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"} archived
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
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
      <div className="rounded-xl border border-border-subtle overflow-hidden bg-surface">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_100px_140px_120px_100px] gap-4 px-4 py-3 border-b border-border-subtle bg-surface-raised text-xs font-medium text-text-faint uppercase tracking-wider">
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
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No tasks match your search.
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
                      onClick={() => restoreTask(task.id)}
                      className="gap-1 text-text-muted hover:text-success"
                      title="Restore task"
                    >
                      <RotateCcw size={14} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDeleteTarget(task)}
                      className="gap-1 text-text-muted hover:text-error"
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
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
