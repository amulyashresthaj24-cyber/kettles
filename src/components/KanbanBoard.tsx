"use client";

import { useState, useMemo, memo } from "react";
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
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "@/components/ui/icon";
import type { Task, TaskStatus } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { TaskCard } from "./TaskCard";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

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
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`flex flex-col gap-md rounded-lg p-md transition-all duration-200 ${
        isOver ? "ring-2 ring-accent ring-opacity-30 shadow-lg" : ""
      }`}
      style={{
        background: "#0f1011",
        border: "1px solid #1e1f20",
        ...(isOver && { borderColor: "var(--accent)", background: "#0f1011" }),
      }}
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
        <div className="flex flex-col gap-sm min-h-[80px] transition-all duration-200">
          {tasks.length === 0 ? (
            <button
              onClick={() => onAddTask(id)}
              className={`rounded-md border border-dashed px-md py-lg text-[12px] transition-all duration-200 ${
                isOver
                  ? "border-accent border-solid bg-accent/5 text-accent"
                  : "border-border-subtle text-text-faint hover:border-border hover:text-text-muted"
              }`}
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

const MemoizedKanbanColumn = memo(KanbanColumn);

function SortableTaskCard({ task, onEdit }: { task: Task; onEdit?: (task: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`transition-all ${isOver ? "scale-105" : "scale-100"}`}
    >
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
}

const MemoizedSortableTaskCard = memo(SortableTaskCard);

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

  const activeTask = useMemo(
    () => activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null,
    [activeTaskId, tasks]
  );

  const grouped = useMemo(() => 
    COLUMNS.map((col) => ({
      ...col,
      tasks: tasks
        .filter((t) => t.status === col.id && !t.archived)
        .sort(
          (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
        ),
    })),
    [tasks]
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTaskId(e.active.id as string);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const col = COLUMNS.find((c) => c.id === overId);
    if (col) {
      setTaskStatus(taskId, col.id);
      return;
    }

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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-md rounded-lg p-2xl text-center" style={{ background: "#0f1011", border: "1px solid #1e1f20" }}>
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
          <MemoizedKanbanColumn
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
          <div className="rotate-1 opacity-95 shadow-2xl scale-105">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
