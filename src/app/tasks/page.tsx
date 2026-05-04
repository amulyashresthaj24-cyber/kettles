"use client";

import { useMemo, useState } from "react";
import { Plus, SquaresFour as LayoutGrid, List, Archive as ArchiveIcon } from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskList } from "@/components/TaskList";
import { TaskArchive } from "@/components/TaskArchive";
import { AddTaskModal } from "@/components/AddTaskModal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { TaskStatus, Urgency } from "@/lib/types";

export default function TasksPage() {
  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const selectedProjectId = useApp((s) => s.selectedProjectId);
  const setSelectedProject = useApp((s) => s.setSelectedProject);
  const selectedUrgency = useApp((s) => s.selectedUrgency);
  const setSelectedUrgency = useApp((s) => s.setSelectedUrgency);

  const [openAdd, setOpenAdd] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showArchived, setShowArchived] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (showArchived) {
        return t.archived === true;
      }
      if (t.archived) return false;
      if (t.deletedAt) return false;
      if (selectedProjectId && t.projectId !== selectedProjectId) return false;
      if (selectedUrgency !== "all" && t.urgency !== selectedUrgency)
        return false;
      return true;
    });
  }, [tasks, selectedProjectId, selectedUrgency, showArchived]);

  const openAddTask = (status: TaskStatus = "todo") => {
    setDefaultStatus(status);
    setOpenAdd(true);
  };

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setOpenAdd(true);
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const archivedCount = tasks.filter((t: any) => t.archived).length;

  return (
    <div className="flex flex-col gap-2xl">
      {/* Header with CTA */}
      <header className="flex items-center justify-between gap-lg">
        <div className="flex flex-col gap-xs">
          <h1 className="text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-text-primary">
            {showArchived ? "Archived Tasks" : "Tasks"}
          </h1>
          <p className="text-[14px] text-text-muted">
            {showArchived ? (
              "View and manage archived tasks"
            ) : (
              <>
                {activeProject
                  ? `Filtered by ${activeProject.name}`
                  : "All tasks and projects"}
                {selectedUrgency !== "all" && ` · ${selectedUrgency}`}
              </>
            )}
          </p>
        </div>
        {!showArchived && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddTask("todo")}
            className="gap-1.5 shrink-0"
          >
            <Plus size={14} />
            New Task
          </Button>
        )}
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-[8px] bg-surface-raised px-3 py-2">
        {!showArchived && (
          <>
            <Select
              value={selectedProjectId ?? ""}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-auto min-w-[140px]"
              size="sm"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedUrgency}
              onChange={(e) =>
                setSelectedUrgency(e.target.value as Urgency | "all")
              }
              className="w-auto min-w-[130px]"
              size="sm"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!showArchived && (
            <div
              className="flex items-center bg-surface-raised rounded-[8px] p-0.5 gap-0.5"
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => setView("kanban")}
                className={`p-1.5 rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  view === "kanban"
                    ? "bg-surface-mid text-text-primary shadow-sm"
                    : "text-text-faint hover:text-text-primary"
                }`}
                aria-label="Kanban view"
                aria-pressed={view === "kanban"}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  view === "list"
                    ? "bg-surface-mid text-text-primary shadow-sm"
                    : "text-text-faint hover:text-text-primary"
                }`}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <List size={14} />
              </button>
            </div>
          )}

          <button
            onClick={() => setShowArchived(!showArchived)}
            aria-pressed={showArchived}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
              showArchived
                ? "bg-accent/10 text-accent"
                : "bg-surface-raised text-text-muted hover:text-text-secondary"
            }`}
            title={archivedCount > 0 ? `${archivedCount} archived task${archivedCount !== 1 ? "s" : ""}` : "No archived tasks"}
          >
            <ArchiveIcon size={13} />
            <span>Archive</span>
            {archivedCount > 0 && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${showArchived ? "bg-accent/15 text-accent" : "bg-surface-mid text-text-faint"}`}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showArchived ? (
        <TaskArchive tasks={filteredTasks} />
      ) : view === "kanban" ? (
        <KanbanBoard tasks={filteredTasks} onAddTask={openAddTask} onEditTask={openEditTask} />
      ) : (
        <TaskList tasks={filteredTasks} onAddTask={openAddTask} onEditTask={openEditTask} />
      )}

      <AddTaskModal
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
          setEditingTask(null);
        }}
        defaultStatus={defaultStatus}
        defaultProjectId={selectedProjectId ?? undefined}
        editingTask={editingTask}
      />
    </div>
  );
}
