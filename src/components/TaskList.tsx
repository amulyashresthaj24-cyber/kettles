"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw, CheckSquare } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { UrgencyDot } from "./UrgencyDot";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function TaskList({
  tasks,
  onAddTask,
}: {
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
}) {
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const startSession = useApp((s) => s.startSession);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const setTaskStatus = useApp((s) => s.setTaskStatus);

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-md rounded-lg bg-surface p-2xl text-center">
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
    { status: "in_progress", label: "In Progress", tasks: [] },
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
    startSession(taskId);
    router.push("/timer");
  };

  return (
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

            <div className="flex flex-col border border-border-subtle rounded-lg bg-surface overflow-hidden">
              {group.tasks.map((task, index) => {
                const project = projects.find((p) => p.id === task.projectId);
                const client = project?.clientId
                  ? clients.find((c) => c.id === project.clientId)
                  : undefined;
                const isLast = index === group.tasks.length - 1;

                return (
                  <div
                    key={task.id}
                    onClick={() => handleStart(task.id)}
                    className={`group flex items-center gap-md px-md py-sm transition-colors hover:bg-surface-raised cursor-pointer ${
                      !isLast ? "border-b border-border-subtle" : ""
                    }`}
                  >
                    <div className="flex items-center gap-md flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskStatus(task.id, task.status === "done" ? "todo" : "done");
                        }}
                        className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                          task.status === "done"
                            ? "bg-status-success border-status-success"
                            : "border-text-muted hover:border-text-primary"
                        }`}
                      >
                        {task.status === "done" && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 6L4.5 9.5L11 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      <UrgencyDot urgency={task.urgency} size={7} />

                      <span
                        className={`text-[14px] font-medium truncate ${
                          task.status === "done"
                            ? "text-text-muted line-through"
                            : "text-text-primary"
                        }`}
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

                      <div className="w-[80px] flex justify-end">
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
                            <Play size={11} />
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
                            <RotateCcw size={11} />
                            Reopen
                          </Button>
                        )}
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
  );
}
