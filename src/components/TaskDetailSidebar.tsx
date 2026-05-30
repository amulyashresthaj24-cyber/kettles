"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { TagEditor } from "./TagEditor";
import type { Task, ProjectColor } from "@/lib/types";
import { PROJECT_COLOR_HEX } from "@/lib/constants";

function getProjectColor(c: string) { return PROJECT_COLOR_HEX[c as ProjectColor] ?? "var(--text-muted)"; }

const URGENCY_COLOR: Record<string, string> = {
  urgent: "var(--error)",
  high: "#f59e0b",
  normal: "var(--success)",
  low: "var(--text-faint)",
};

interface TaskDetailSidebarProps {
  taskId: string | null;
  onClose: () => void;
  onEditTask?: (task: Task) => void;
}

export function TaskDetailSidebar({ taskId, onClose, onEditTask }: TaskDetailSidebarProps) {
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const sessions = useApp((s) => s.sessions);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const updateTask = useApp((s) => s.updateTask);

  const task = tasks.find((t) => t.id === taskId) ?? null;
  const project = task ? projects.find((p) => p.id === task.projectId) : null;
  const activeTaskId = sessions.find((s) => s.id === activeSessionId)?.taskId ?? null;
  const isActive = task?.id === activeTaskId;

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) setTitleDraft(task.title);
    setEditingTitle(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    if (editingTitle) inputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (!taskId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [taskId, onClose]);

  function commitTitle() {
    if (!task) return;
    if (titleDraft.trim() && titleDraft !== task.title) {
      updateTask(task.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }

  const STATUS_OPTIONS: { value: "todo" | "doing" | "done"; label: string }[] = [
    { value: "todo", label: "To Do" },
    { value: "doing", label: "In Progress" },
    { value: "done", label: "Done" },
  ];

  if (!taskId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col overflow-hidden panel-animate"
        style={{
          background: "var(--surface-raised)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-6 shrink-0 gap-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={inputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") { setTitleDraft(task?.title ?? ""); setEditingTitle(false); }
                }}
                className="w-full text-[17px] font-semibold bg-transparent border-b-2 outline-none pb-0.5"
                style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
              />
            ) : (
              <h2
                className="text-[17px] font-semibold leading-snug cursor-text hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-primary)" }}
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
              >
                {task?.title ?? "Loading…"}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] shrink-0 hover:bg-[var(--surface-mid)] transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {task && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-6">

              {/* Active session banner */}
              {isActive && (
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[10px]"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <span className="w-2 h-2 rounded-full animate-slow-pulse shrink-0" style={{ background: "var(--success)" }} />
                  <span className="text-[12px] font-medium" style={{ color: "var(--success)" }}>
                    Active session running
                  </span>
                </div>
              )}

              {/* Meta row: project + urgency */}
              <div className="flex items-center gap-2 flex-wrap">
                {project && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
                    style={{
                      background: getProjectColor(project.color) + "22",
                      color: getProjectColor(project.color),
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getProjectColor(project.color) }} />
                    {project.name}
                  </div>
                )}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium capitalize"
                  style={{
                    background: (URGENCY_COLOR[task.urgency] ?? "var(--text-faint)") + "20",
                    color: URGENCY_COLOR[task.urgency] ?? "var(--text-faint)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: URGENCY_COLOR[task.urgency] ?? "var(--text-faint)" }}
                  />
                  {task.urgency}
                </div>
              </div>

              {/* Status segmented control */}
              <div>
                <span className="text-[11px] uppercase tracking-wider font-medium block mb-2" style={{ color: "var(--text-faint)" }}>
                  Status
                </span>
                <div
                  className="flex items-center rounded-[10px] p-0.5 gap-0.5"
                  style={{ background: "var(--surface-mid)" }}
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTaskStatus(task.id, value)}
                      className={cn(
                        "flex-1 h-8 text-[12px] font-medium rounded-[8px] transition-all",
                        task.status === value
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      )}
                      style={task.status === value ? { background: "var(--surface-raised)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-faint)" }}>
                  Date
                </span>
                <p className="text-[14px]" style={{ color: task.dateRange ? "var(--text-primary)" : "var(--text-faint)" }}>
                  {task.dateRange ?? "No date set"}
                </p>
              </div>

              {/* Estimate */}
              {task.estimateMinutes && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-faint)" }}>
                    Estimate
                  </span>
                  <div className="flex items-center gap-1.5 text-[14px]" style={{ color: "var(--text-primary)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" style={{ color: "var(--text-muted)" }} />
                      <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ color: "var(--text-muted)" }} />
                    </svg>
                    {task.estimateMinutes} min
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <span className="text-[11px] uppercase tracking-wider font-medium block mb-1.5" style={{ color: "var(--text-faint)" }}>
                  Description
                </span>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: task.description ? "var(--text-secondary)" : "var(--text-faint)" }}
                >
                  {task.description || "No description"}
                </p>
              </div>

              {/* Tags */}
              <div>
                <span className="text-[11px] uppercase tracking-wider font-medium block mb-1" style={{ color: "var(--text-faint)" }}>
                  Tags
                </span>
                <TagEditor task={task} />
              </div>

            </div>
          </div>
        )}

        {/* Footer actions */}
        <div
          className="flex items-center gap-3 p-5 shrink-0"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-[8px] text-[13px] font-medium transition-colors hover:opacity-80"
            style={{ background: "var(--surface-mid)", color: "var(--text-secondary)" }}
          >
            Close
          </button>
          <button
            onClick={() => {
              if (task && onEditTask) {
                onClose();
                onEditTask(task);
              }
            }}
            className="flex-1 h-9 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)" }}
          >
            Full editor →
          </button>
        </div>
      </div>
    </>
  );
}
