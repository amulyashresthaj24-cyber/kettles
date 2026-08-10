"use client";

import { useState, useMemo, memo } from "react";
import {
  DndContext,
  DragEndEvent,
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
import { useNotification } from "@/components/ui/notification";
import { TaskCard } from "./TaskCard";

const COLUMNS: {
  id: TaskStatus;
  label: string;
  dot: string;
  glow: string;
  ring: string;
  emptyText: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    dot: "bg-[--text-faint]",
    glow: "rgba(148,163,184,0.12)",
    ring: "rgba(148,163,184,0.35)",
    emptyText: "Nothing queued",
  },
  {
    id: "doing",
    label: "In Progress",
    dot: "bg-amber-400",
    glow: "rgba(251,191,36,0.08)",
    ring: "rgba(251,191,36,0.4)",
    emptyText: "Nothing in flight",
  },
  {
    id: "done",
    label: "Done",
    dot: "bg-emerald-400",
    glow: "rgba(52,211,153,0.08)",
    ring: "rgba(52,211,153,0.35)",
    emptyText: "Nothing completed yet",
  },
];

const URGENCY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

function KanbanColumn({
  id,
  label,
  dot,
  glow,
  ring,
  emptyText,
  tasks,
  onAddTask,
  onEditTask,
}: {
  id: TaskStatus;
  label: string;
  dot: string;
  glow: string;
  ring: string;
  emptyText: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className="flex flex-col gap-3 rounded-xl p-3 transition-all duration-300"
      style={{
        background: isOver ? glow : "var(--surface)",
        border: `1px solid ${isOver ? ring : "var(--border-subtle)"}`,
        boxShadow: isOver
          ? `0 0 0 2px ${ring}, 0 8px 32px ${glow}`
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dot} shrink-0`} />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary">
            {label}
          </h3>
        </div>
        <span
          className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums transition-colors"
          style={{
            background: "var(--surface-mid)",
            color: "var(--text-faint)",
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 min-h-[72px]">
          {tasks.length === 0 ? (
            <button
              onClick={() => onAddTask(id)}
              className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-6 text-[12px] transition-all duration-200"
              style={{
                borderColor: isOver ? ring : "var(--border-subtle)",
                color: isOver ? "var(--accent)" : "var(--text-faint)",
                background: isOver ? glow : "transparent",
              }}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full transition-colors group-hover:bg-[--surface-mid]"
                style={{ background: "var(--surface)" }}
              >
                <Plus size={12} />
              </span>
              <span>{emptyText}</span>
            </button>
          ) : (
            tasks.map((task, i) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                index={i}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Footer add button */}
      {tasks.length > 0 && (
        <button
          onClick={() => onAddTask(id)}
          className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[12px] font-medium text-text-faint transition-all duration-150 hover:bg-[--surface-mid] hover:text-text-secondary"
        >
          <Plus size={11} />
          Add task
        </button>
      )}
    </div>
  );
}

const MemoizedKanbanColumn = memo(KanbanColumn);

function SortableTaskCard({
  task,
  onEdit,
  index,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
  index: number;
}) {
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
    transition: transition ?? "transform 220ms cubic-bezier(0.16,1,0.3,1)",
    animationDelay: `${index * 40}ms`,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-dashed border-accent/20 bg-accent/[0.03] min-h-[100px] transition-all duration-200"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="animate-fade-up"
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
  const { notify } = useNotification();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeTask = useMemo(
    () => (activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null),
    [activeTaskId, tasks]
  );

  const grouped = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        tasks: tasks
          .filter((t) => t.status === col.id && !t.archived)
          .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]),
      })),
    [tasks]
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTaskId(e.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTaskId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const col = COLUMNS.find((c) => c.id === overId);
    const nextStatus = col ? col.id : tasks.find((t) => t.id === overId)?.status;
    if (!nextStatus || task.status === nextStatus) return;

    try {
      await setTaskStatus(taskId, nextStatus);
    } catch {
      notify({
        tone: "error",
        title: "Couldn't move task",
        description: `"${task.title}" stayed in ${COLUMNS.find((c) => c.id === task.status)?.label ?? task.status}.`,
      });
    }
  };

  if (tasks.length === 0) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl p-12 text-center"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <p className="text-[15px] text-text-secondary">No tasks match this filter.</p>
        <button
          onClick={() => onAddTask("todo")}
          className="text-[13px] font-medium text-accent hover:text-[--accent-hover] transition-colors"
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
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {grouped.map((col) => (
          <MemoizedKanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            dot={col.dot}
            glow={col.glow}
            ring={col.ring}
            emptyText={col.emptyText}
            tasks={col.tasks}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {activeTask ? (
          <div
            className="rotate-[1.5deg] scale-[1.03] opacity-[0.97]"
            style={{
              filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.18))",
              willChange: "transform",
            }}
          >
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
