"use client";

import { useMemo, useState } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskList } from "@/components/TaskList";
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
  const [editingTask, setEditingTask] = useState<any>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId && t.projectId !== selectedProjectId) return false;
      if (selectedUrgency !== "all" && t.urgency !== selectedUrgency)
        return false;
      return true;
    });
  }, [tasks, selectedProjectId, selectedUrgency]);

  const openAddTask = (status: TaskStatus = "todo") => {
    setDefaultStatus(status);
    setOpenAdd(true);
  };

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setOpenAdd(true);
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col gap-2xl">
      {/* Header with CTA */}
      <header className="flex items-center justify-between gap-lg">
        <div className="flex flex-col gap-xs">
          <h1 className="text-[32px] font-semibold leading-[1.25] tracking-[-0.01em] text-text-primary">
            Tasks
          </h1>
          <p className="text-[14px] text-text-muted">
            {activeProject
              ? `Filtered by ${activeProject.name}`
              : "All projects"}
            {selectedUrgency !== "all" && ` · ${selectedUrgency}`}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openAddTask("todo")}
          className="gap-1.5 shrink-0"
        >
          <Plus size={14} />
          New Task
        </Button>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 rounded-[8px] bg-surface-mid px-3 py-2">
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
          <option value="all">All urgencies</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟡 High</option>
          <option value="normal">🟢 Normal</option>
          <option value="low">⚪ Low</option>
        </Select>

        <div className="ml-auto flex items-center bg-surface-raised rounded-[8px] p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-[8px] transition-colors ${
              view === "kanban"
                ? "bg-surface-mid text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
            aria-label="Kanban View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-[8px] transition-colors ${
              view === "list"
                ? "bg-surface-mid text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
            aria-label="List View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard tasks={filteredTasks} onAddTask={openAddTask} onEditTask={openEditTask} />
      ) : (
        <TaskList tasks={filteredTasks} onAddTask={openAddTask} />
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
