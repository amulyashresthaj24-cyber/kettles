"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { TaskCard } from "./TaskCard";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function KanbanBoard({
  tasks,
  onAddTask,
  onEditTask,
}: {
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
}) {
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks
      .filter((t) => t.status === col.id)
      .sort(
        (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
      ),
  }));

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTaskId(e.active.id as string);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // over a column id directly
    const col = COLUMNS.find((c) => c.id === overId);
    if (col) {
      setTaskStatus(taskId, col.id);
      return;
    }

    // over another task — move to that task's column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        setTaskStatus(taskId, overTask.status);
      }
    }
  };

  const handleDragEnd = (_e: DragEndEvent) => {
    setActiveTaskId(null);
  };

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        {grouped.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={col.tasks}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-1 opacity-90 shadow-2xl">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  id,
  label,
  tasks,
  onAddTask,
  onEditTask,
}: {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-md rounded-lg bg-surface p-md"
    >
      <div className="flex items-center justify-between px-xs">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          {label}
        </h3>
        <span className="text-[12px] text-text-muted">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-sm min-h-[80px]">
          {tasks.length === 0 ? (
            <button
              onClick={() => onAddTask(id)}
              className="rounded-md border border-dashed border-border-subtle px-md py-lg text-[12px] text-text-faint hover:border-border hover:text-text-muted transition-colors"
            >
              Drop here or + Add
            </button>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} onEdit={onEditTask} />
            ))
          )}
        </div>
      </SortableContext>

      {tasks.length > 0 && (
        <button
          onClick={() => onAddTask(id)}
          className="flex items-center gap-xs self-start rounded-md px-xs py-xs text-[12px] text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
        >
          <Plus size={12} /> Add task
        </button>
      )}
    </div>
  );
}

function SortableTaskCard({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
}
