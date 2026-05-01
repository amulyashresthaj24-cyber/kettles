"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw, ArrowLeft, ArrowRight, CheckCheck, Edit2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { ProjectTag } from "./ProjectTag";
import { ClientBadge } from "./ClientBadge";
import { Button } from "./ui/button";

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", bg: "bg-red-500/20", text: "text-red-500" },
  high: { label: "High", bg: "bg-accent-dim", text: "text-accent" },
  normal: { label: "Normal", bg: "bg-blue-500/20", text: "text-blue-500" },
  low: { label: "Low", bg: "bg-gray-500/20", text: "text-gray-500" },
};

export function TaskCard({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
  const router = useRouter();
  const project = useApp((s) =>
    s.projects.find((p) => p.id === task.projectId)
  );
  const client = useApp((s) =>
    project?.clientId
      ? s.clients.find((c) => c.id === project.clientId)
      : undefined
  );
  const setTaskStatus = useApp((s) => s.setTaskStatus);
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
    <div
      onClick={handleCardClick}
      className="group flex flex-col gap-md rounded-md bg-surface-raised p-md transition-all hover:bg-surface-mid hover:shadow-md cursor-pointer hover:scale-[1.02]"
    >
      {/* Title row with urgency tag */}
      <div className="flex items-start gap-sm justify-between">
        <p
          className={`text-[13px] font-medium leading-snug tracking-[-0.01em] flex-1 ${
            task.status === "done"
              ? "text-text-muted line-through"
              : "text-text-primary"
          }`}
        >
          {task.title}
        </p>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${urgencyConfig.bg} ${urgencyConfig.text}`}>
          {urgencyConfig.label}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-xs">
        {project && <ProjectTag project={project} />}
        <ClientBadge client={client} />
      </div>

      {/* Estimate + action */}
      <div className="flex items-center justify-between text-[12px] text-text-muted">
        <span>
          {task.estimateMinutes
            ? `Est: ${task.estimateMinutes} min`
            : "No estimate"}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-xs border-t border-border-subtle pt-sm">
        {task.status !== "done" ? (
          <>
            {task.status !== "todo" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskStatus(task.id, "todo");
                }}
                className="flex items-center gap-1 text-[11px]"
              >
                <ArrowLeft size={12} /> To Do
              </Button>
            )}
            {task.status !== "in_progress" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskStatus(task.id, "in_progress");
                }}
                className="text-[11px]"
              >
                In Progress
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setTaskStatus(task.id, "done");
              }}
              className="ml-auto flex items-center gap-1 text-[11px]"
            >
              <CheckCheck size={12} /> Done
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setTaskStatus(task.id, "todo");
              }}
              className="flex items-center gap-1 text-[11px]"
            >
              <RotateCcw size={12} /> Reopen
            </Button>
            <div className="ml-auto" />
          </>
        )}
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="flex items-center gap-1 text-[11px]"
          >
            <Edit2 size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
