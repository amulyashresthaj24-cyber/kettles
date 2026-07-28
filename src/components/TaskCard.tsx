"use client";

import { useRouter } from "next/navigation";
import {
  Play,
  ArrowClockwise,
  Checks,
  PencilSimple,
  Archive,
  Trash,
  Spinner,
} from "@/components/ui/icon";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { Badge } from "./ui/badge";
import { useState } from "react";

const URGENCY_BADGE_VARIANT: Record<
  string,
  "error" | "warning" | "accent" | "raised"
> = {
  urgent: "error",
  high: "warning",
  normal: "accent",
  low: "raised",
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-[--text-faint]",
  doing: "bg-amber-400",
  done: "bg-emerald-400",
};

export function TaskCard({
  task,
  onEdit,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const project = useApp((s) => s.projects.find((p) => p.id === task.projectId));
  const client = useApp((s) =>
    project?.clientId ? s.clients.find((c) => c.id === project.clientId) : undefined
  );
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const archiveTask = useApp((s) => s.archiveTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const startSession = useApp((s) => s.startSession);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const isActive = sessions.find((s) => s.id === activeSessionId)?.taskId === task.id;

  const plannedMinutes =
    task.estimateMinutes && task.estimateMinutes > 0 ? task.estimateMinutes : undefined;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeSessionId) void startSession(task.id, undefined, plannedMinutes);
    router.push("/timer");
  };

  const handleCardClick = () => {
    if (!activeSessionId) void startSession(task.id, undefined, plannedMinutes);
    router.push("/timer");
  };

  const isDone = task.status === "done";
  const urgencyLabel = task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1);

  return (
    <>
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        aria-label={`${task.title} — click to start timer`}
        className={[
          "group flex flex-col gap-2.5 rounded-xl border p-3.5 cursor-pointer",
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
          isActive
            ? "border-transparent bg-accent/[0.06] shadow-[0_4px_16px_rgba(2,86,214,0.08)]"
            : isDone
            ? "border-[--border-subtle] bg-[--surface-raised] opacity-55 hover:opacity-80 hover:border-[--border] hover:shadow-sm"
            : "border-[--border-subtle] bg-[--surface-raised] hover:border-[--border] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-px",
        ].join(" ")}
      >
        {/* Title + urgency */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full transition-colors ${STATUS_DOT[task.status]}`}
            />
          </div>
          <p
            className={[
              "flex-1 min-w-0 break-words text-[13px] font-medium leading-snug tracking-[-0.01em]",
              isDone ? "text-text-faint line-through" : "text-text-primary",
            ].join(" ")}
          >
            {task.title || "Untitled task"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isActive && (
              <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                <Spinner size={9} className="animate-spin" />
                Live
              </span>
            )}
            <Badge
              variant={URGENCY_BADGE_VARIANT[task.urgency] || "accent"}
              className="shrink-0 whitespace-nowrap"
            >
              {urgencyLabel}
            </Badge>
          </div>
        </div>

        {/* Meta tags */}
        {(project || client) && (
          <div className="flex flex-wrap items-center gap-1.5 pl-4">
            {project && <ProjectTag project={project} />}
            <ClientBadge client={client} />
          </div>
        )}

        {/* Estimate */}
        {task.estimateMinutes ? (
          <p className="pl-4 text-[11px] text-text-faint">
            Est. {task.estimateMinutes} min
          </p>
        ) : null}

        {/* Actions — visible on hover / always on mobile */}
        <div
          className={[
            "flex items-center gap-0.5 border-t border-[--border-subtle] pt-2.5",
            "transition-all duration-150",
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            isActive && "opacity-100",
          ].join(" ")}
        >
          {!isDone ? (
            <>
              {task.status !== "todo" && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskStatus(task.id, "todo");
                  }}
                  className="flex items-center gap-1 text-[11px]"
                >
                  <ArrowClockwise size={11} />
                  To Do
                </Button>
              )}
              {task.status !== "doing" && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskStatus(task.id, "doing");
                  }}
                  className="text-[11px]"
                >
                  In Progress
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskStatus(task.id, "done");
                }}
                className="ml-auto flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-500"
              >
                <Checks size={11} />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskStatus(task.id, "todo");
                }}
                className="flex items-center gap-1 text-[11px]"
              >
                <ArrowClockwise size={11} />
                Reopen
              </Button>
              <div className="ml-auto" />
            </>
          )}

          {onEdit && (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              aria-label="Edit task"
            >
              <PencilSimple size={12} />
            </Button>
          )}

          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              archiveTask(task.id);
            }}
            aria-label="Archive task"
            className="text-text-faint hover:text-text-muted"
          >
            <Archive size={12} />
          </Button>

          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            aria-label="Delete task"
            className="text-text-faint hover:text-error"
          >
            <Trash size={12} />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        description={`This will permanently delete "${task.title}". This action cannot be undone.`}
        pending={isDeleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteTask(task.id);
            setConfirmDelete(false);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );
}
