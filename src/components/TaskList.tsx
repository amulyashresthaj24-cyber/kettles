"use client";

import { useRouter } from "next/navigation";
import { Play, ArrowClockwise, CheckSquare, Archive, Trash, PencilSimple } from "@/components/ui/icon";
import { useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { useTaskArchive } from "@/lib/use-task-archive";
import { cn } from "@/lib/utils";
import { UrgencyDot } from "./UrgencyDot";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function TaskList({
  tasks,
  onAddTask,
  onEditTask,
}: {
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
}) {
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const startSession = useApp((s) => s.startSession);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const runArchive = useTaskArchive();
  const deleteTask = useApp((s) => s.deleteTask);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingTasks, setCompletingTasks] = useState<Record<string, boolean>>({});
  const [reopeningTasks, setReopeningTasks] = useState<Record<string, boolean>>({});

  const handleToggleStatus = (taskId: string, currentStatus: TaskStatus) => {
    if (currentStatus === "done") {
      setReopeningTasks((prev) => ({ ...prev, [taskId]: true }));
      setTimeout(() => {
        setTaskStatus(taskId, "todo");
        setReopeningTasks((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 350);
    } else {
      setCompletingTasks((prev) => ({ ...prev, [taskId]: true }));
      setTimeout(() => {
        setTaskStatus(taskId, "done");
        setCompletingTasks((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 350);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-md rounded-lg p-2xl text-center" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-[16px] text-text-secondary">
          No tasks match this filter.
        </p>
        <button
          onClick={() => onAddTask("todo")}
          className="text-[14px] font-medium text-accent hover:text-accent-hover"
        >
          + Add a task
        </button>
      </div>
    );
  }

  // Group tasks by status
  const groups: { status: TaskStatus; label: string; tasks: Task[] }[] = [
    { status: "todo", label: "To Do", tasks: [] },
    { status: "doing", label: "Doing", tasks: [] },
    { status: "done", label: "Done", tasks: [] },
  ];

  tasks.forEach((task) => {
    const group = groups.find((g) => g.status === task.status);
    if (group) group.tasks.push(task);
  });

  // Sort tasks by urgency in each group
  groups.forEach((group) => {
    group.tasks.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  });

  const handleStart = (taskId: string) => {
    if (activeSessionId) {
      router.push("/timer");
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    const planned =
      task?.estimateMinutes && task.estimateMinutes > 0 ? task.estimateMinutes : undefined;
    void startSession(taskId, undefined, planned);
    router.push("/timer");
  };

  return (
    <>
      <div className="flex flex-col gap-3xl">
      {groups.map((group) => {
        if (group.tasks.length === 0) return null;

        return (
          <div key={group.status} className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm px-xs">
              <h3 className="text-[14px] font-semibold text-text-primary">
                {group.label}
              </h3>
              <span className="text-[12px] text-text-muted">{group.tasks.length}</span>
            </div>

            <div className="flex flex-col rounded-lg overflow-hidden" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
              {group.tasks.map((task, index) => {
                const project = projects.find((p) => p.id === task.projectId);
                const client = project?.clientId
                  ? clients.find((c) => c.id === project.clientId)
                  : undefined;
                const isCompleting = completingTasks[task.id];
                const isReopening = reopeningTasks[task.id];
                const isTaskDone = (task.status === "done" && !isReopening) || isCompleting;
                const isLast = index === group.tasks.length - 1;

                return (
                  <div
                    key={task.id}
                    onClick={() => handleStart(task.id)}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-all hover:bg-surface-raised cursor-pointer",
                      !isLast && "border-b border-border-subtle",
                      (isCompleting || isReopening) && "task-row-completing"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Custom themed checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(task.id, task.status);
                        }}
                        disabled={isCompleting || isReopening}
                        className={cn(
                          "shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-150",
                          isTaskDone
                            ? "bg-success border-success shadow-sm"
                            : "border-border hover:border-text-secondary bg-surface",
                          isCompleting && "animate-checkbox-pop"
                        )}
                      >
                        {isTaskDone && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      <UrgencyDot urgency={task.urgency} size={8} />

                      <span
                        className={cn(
                          "text-[14px] font-medium truncate transition-all duration-300",
                          isTaskDone
                            ? "text-text-muted line-through"
                            : "text-text-primary"
                        )}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-md shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-xs">
                        {project && <ProjectTag project={project} />}
                        <ClientBadge client={client} />
                      </div>

                      <span className="text-[12px] text-text-muted w-[80px] text-right">
                        {task.estimateMinutes ? `${task.estimateMinutes}m` : "--"}
                      </span>

                      <div className="flex justify-end gap-1">
                        {/* Edit button */}
                        {onEditTask && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                            className="gap-1 text-text-muted hover:text-text-primary"
                            title="Edit task"
                          >
                            <PencilSimple size={14} />
                          </Button>
                        )}

                        {task.status !== "done" ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(task.id);
                            }}
                            className="gap-1"
                          >
                            <Play size={14} />
                            Start
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskStatus(task.id, "todo");
                            }}
                            className="gap-1"
                          >
                            <ArrowClockwise size={14} />
                            Reopen
                          </Button>
                        )}

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            runArchive(task, "archive");
                          }}
                          className="gap-1 text-text-muted hover:text-accent"
                          title="Archive"
                        >
                          <Archive size={14} />
                        </Button>

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(task);
                          }}
                          className="gap-1 text-text-muted hover:text-error"
                          title="Delete"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete task?"
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
