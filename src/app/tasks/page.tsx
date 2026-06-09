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
import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout";
import type { Task, TaskStatus, Urgency } from "@/lib/types";

const NO_PROJECT = "__none__";

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
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (showArchived) {
        return t.archived === true;
      }
      if (t.archived) return false;
      if (t.deletedAt) return false;
      if (selectedProjectId === NO_PROJECT) {
        if (t.projectId) return false;
      } else if (selectedProjectId && t.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedUrgency !== "all" && t.urgency !== selectedUrgency)
        return false;
      return true;
    });
  }, [tasks, selectedProjectId, selectedUrgency, showArchived]);

  const openAddTask = (status: TaskStatus = "todo") => {
    setDefaultStatus(status);
    setOpenAdd(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setOpenAdd(true);
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const archivedCount = tasks.filter((t) => t.archived).length;

  return (
    <PageLayout>
      <PageHeader
        title={showArchived ? "Archived Tasks" : "Tasks"}
        subtitle={
          showArchived ? (
            "View and manage archived tasks"
          ) : (
            <>
              {activeProject
                ? `Filtered by ${activeProject.name}`
                : "All tasks and projects"}
              {selectedUrgency !== "all" && ` · ${selectedUrgency}`}
            </>
          )
        }
        action={
          !showArchived && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAddTask("todo")}
              className="gap-1.5"
            >
              <Plus size={14} />
              New Task
            </Button>
          )
        }
      />

      <PageToolbar
        left={
          !showArchived && (
            <>
              <Select
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="w-auto min-w-[140px]"
                size="sm"
              >
                <option value="">All projects</option>
                <option value={NO_PROJECT}>No project</option>
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
          )
        }
        right={
          <>
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
          </>
        }
      />

      <PageContent>
        {showArchived ? (
          <TaskArchive tasks={filteredTasks} />
        ) : view === "kanban" ? (
          <KanbanBoard tasks={filteredTasks} onAddTask={openAddTask} onEditTask={openEditTask} />
        ) : (
          <TaskList tasks={filteredTasks} onAddTask={openAddTask} onEditTask={openEditTask} />
        )}
      </PageContent>

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
    </PageLayout>
  );
}
