"use client";

import { useRouter } from "next/navigation";
import { Play, ArrowClockwise, Checks, PencilSimple, Archive, Trash } from "@/components/ui/icon";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { useState } from "react";

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", bg: "bg-error/12", text: "text-error" },
  high:   { label: "High",   bg: "bg-warning/12", text: "text-warning" },
  normal: { label: "Normal", bg: "bg-accent/10",  text: "text-accent" },
  low:    { label: "Low",    bg: "bg-surface-mid", text: "text-text-faint" },
};

export function TaskCard({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const project = useApp((s) =>
    s.projects.find((p) => p.id === task.projectId)
  );
  const client = useApp((s) =>
    project?.clientId
      ? s.clients.find((c) => c.id === project.clientId)
      : undefined
  );
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const archiveTask = useApp((s) => s.archiveTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const startSession = useApp((s) => s.startSession);
  const activeSessionId = useApp((s) => s.activeSessionId);

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSessionId) {
      router.push("/timer");
      return;
    }
    startSession(task.id);
    router.push("/timer");
  };

  const handleCardClick = () => {
    startSession(task.id);
    router.push("/timer");
  };

  const urgencyConfig = URGENCY_CONFIG[task.urgency] || URGENCY_CONFIG.normal;

  return (
    <>
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        aria-label={`${task.title} — click to start timer`}
        className="group flex flex-col gap-3 rounded-lg bg-surface-raised p-3.5 transition-all hover:bg-surface-mid cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
      {/* Title row with urgency tag */}
      <div className="flex items-start gap-2 justify-between">
        <p
          className={`text-[13px] font-medium leading-snug tracking-[-0.01em] flex-1 min-w-0 break-words ${
            task.status === "done"
              ? "text-text-faint line-through"
              : "text-text-primary"
          }`}
        >
          {task.title || "Untitled task"}
        </p>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${urgencyConfig.bg} ${urgencyConfig.text}`}>
          {urgencyConfig.label}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-xs">
        {project && <ProjectTag project={project} />}
        <ClientBadge client={client} />
      </div>

      {/* Estimate */}
      {task.estimateMinutes ? (
        <div className="text-[11px] text-text-faint">
          Est. {task.estimateMinutes} min
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-1 border-t border-border-subtle pt-2.5 flex-wrap">
        {task.status !== "done" ? (
          <>
            {task.status !== "todo" && (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); setTaskStatus(task.id, "todo"); }}
                aria-label="Move to To Do"
                className="flex items-center gap-1 text-[11px]"
              >
                <ArrowClockwise size={11} /> To Do
              </Button>
            )}
            {task.status !== "doing" && (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); setTaskStatus(task.id, "doing"); }}
                aria-label="Move to In Progress"
                className="text-[11px]"
              >
                In Progress
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setTaskStatus(task.id, "done"); }}
              aria-label="Mark as done"
              className="ml-auto flex items-center gap-1 text-[11px]"
            >
              <Checks size={11} /> Done
            </Button>
          </>
        ) : (
          <>
            <Button
              size="xs"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setTaskStatus(task.id, "todo"); }}
              aria-label="Reopen task"
              className="flex items-center gap-1 text-[11px]"
            >
              <ArrowClockwise size={11} /> Reopen
            </Button>
            <div className="ml-auto" />
          </>
        )}

        {onEdit && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            aria-label="Edit task"
            title="Edit task"
          >
            <PencilSimple size={12} />
          </Button>
        )}

        <Button
          size="icon-xs"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
          aria-label="Archive task"
          title="Move to archive"
          className="text-text-faint hover:text-text-muted"
        >
          <Archive size={12} />
        </Button>

        <Button
          size="icon-xs"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          aria-label="Delete task"
          title="Delete task permanently"
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
