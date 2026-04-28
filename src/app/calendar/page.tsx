"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  List,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddTaskModal } from "@/components/AddTaskModal";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "week" | "month" | "day" | "list";

interface CalendarEvent {
  task: Task;
  date: Date;
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
  teal: "#14b8a6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  indigo: "#6366f1",
};

function getProjectColor(color: string) {
  return PROJECT_COLORS[color] ?? "#8a8f98";
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${period}`;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYS_LONG = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(new Date());
  const [openAddTask, setOpenAddTask] = useState(false);

  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);

  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter((t) => t.createdAt)
      .map((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        return {
          task: t,
          date: new Date(t.createdAt),
          color: getProjectColor(project?.color ?? ""),
        };
      });
  }, [tasks, projects]);

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(e.date, day));
  }

  function navigate(dir: 1 | -1) {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  }

  function headerLabel() {
    if (view === "day") {
      return `${DAYS_LONG[cursor.getDay() === 0 ? 6 : cursor.getDay() - 1]}, ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
    if (view === "week") {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${MONTHS[ws.getMonth()]} ${ws.getFullYear()} · W${weekNumber(ws)}`;
      return `${MONTHS[ws.getMonth()]} – ${MONTHS[we.getMonth()]} ${ws.getFullYear()} · W${weekNumber(ws)}`;
    }
    return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }

  const VIEW_TABS: { id: ViewMode; Icon: React.ElementType; label: string }[] = [
    { id: "week", Icon: CalIcon, label: "Week" },
    { id: "month", Icon: LayoutGrid, label: "Month" },
    { id: "day", Icon: AlignJustify, label: "Day" },
    { id: "list", Icon: List, label: "List" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--base)", color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-4">
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Calendar
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              aria-label="Previous"
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-medium min-w-[200px] text-center" style={{ color: "var(--text-secondary)" }}>
              {headerLabel()}
            </span>
            <button
              onClick={() => navigate(1)}
              aria-label="Next"
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setCursor(new Date())}
            className="px-3 h-7 text-[12px] font-medium rounded-full transition-colors"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: "var(--surface-raised)" }}>
            {VIEW_TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded-md transition-all",
                  view === id
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                style={view === id ? { background: "var(--surface-mid)" } : {}}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <Button variant="primary" size="default" onClick={() => setOpenAddTask(true)}>
            <Plus size={14} />
            Add Task
          </Button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto">
        {view === "week" && <WeekView cursor={cursor} eventsForDay={eventsForDay} />}
        {view === "month" && <MonthView cursor={cursor} eventsForDay={eventsForDay} />}
        {view === "day" && <DayView cursor={cursor} eventsForDay={eventsForDay} />}
        {view === "list" && <ListView cursor={cursor} events={events} />}
      </div>

      <AddTaskModal open={openAddTask} onClose={() => setOpenAddTask(false)} />
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ cursor, eventsForDay }: { cursor: Date; eventsForDay: (d: Date) => CalendarEvent[] }) {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const today = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid shrink-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="h-12" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="h-12 flex flex-col items-center justify-center gap-0.5" style={{ borderLeft: "1px solid var(--border-subtle)" }}>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                {DAYS_SHORT[i]}
              </span>
              <span
                className={cn(
                  "text-[15px] font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                  isToday ? "text-white" : "text-[var(--text-primary)]"
                )}
                style={isToday ? { background: "var(--accent)" } : {}}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {hours.map((h) => (
            <>
              <div
                key={`label-${h}`}
                className="h-14 flex items-start justify-end pr-2 pt-1"
                style={{ color: "var(--text-faint)" }}
              >
                <span className="text-[11px]">{formatTime(h)}</span>
              </div>
              {days.map((day, di) => {
                const dayEvents = eventsForDay(day).filter((e) => (e.date.getHours() === h));
                return (
                  <div
                    key={`cell-${h}-${di}`}
                    className="h-14 relative"
                    style={{
                      borderLeft: "1px solid var(--border-subtle)",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    {dayEvents.map((ev) => (
                      <EventPill key={ev.task.id} ev={ev} compact />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ cursor, eventsForDay }: { cursor: Date; eventsForDay: (d: Date) => CalendarEvent[] }) {
  const today = new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = startOfWeek(firstDay);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(startDay, i));

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {DAYS_SHORT.map((d) => (
          <div key={d} className="h-10 flex items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: "repeat(6, 1fr)" }}>
        {cells.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === month;
          const dayEvents = eventsForDay(day);
          return (
            <div
              key={i}
              className="p-2 flex flex-col gap-1 overflow-hidden"
              style={{
                borderRight: "1px solid var(--border-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                minHeight: 100,
              }}
            >
              <span
                className={cn(
                  "text-[13px] font-medium w-6 h-6 flex items-center justify-center rounded-full self-center",
                  isToday ? "text-white" : isCurrentMonth ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]"
                )}
                style={isToday ? { background: "var(--accent)" } : {}}
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 3).map((ev) => (
                <EventPill key={ev.task.id} ev={ev} />
              ))}
              {dayEvents.length > 3 && (
                <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>+{dayEvents.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

const DAY_HOUR_PX = 64;
const DAY_GUTTER_PX = 72;

type LaidOutEvent = CalendarEvent & {
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

function layoutDayEvents(evs: CalendarEvent[]): LaidOutEvent[] {
  const items = evs
    .map((e) => {
      const startMin = e.date.getHours() * 60 + e.date.getMinutes();
      const dur = Math.max(30, e.task.estimateMinutes ?? 60);
      return { ...e, startMin, endMin: Math.min(24 * 60, startMin + dur) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: LaidOutEvent[] = [];
  let cluster: (typeof items[number])[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const lanes: number[] = [];
    const placed: { item: typeof cluster[number]; lane: number }[] = [];
    for (const it of cluster) {
      let lane = lanes.findIndex((end) => end <= it.startMin);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(it.endMin);
      } else {
        lanes[lane] = it.endMin;
      }
      placed.push({ item: it, lane });
    }
    const laneCount = lanes.length;
    placed.forEach(({ item, lane }) => out.push({ ...item, lane, laneCount }));
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length === 0 || it.startMin < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.endMin);
    } else {
      flush();
      cluster.push(it);
      clusterEnd = it.endMin;
    }
  }
  flush();
  return out;
}

function DayView({ cursor, eventsForDay }: { cursor: Date; eventsForDay: (d: Date) => CalendarEvent[] }) {
  const today = new Date();
  const isToday = isSameDay(cursor, today);
  const laid = useMemo(() => layoutDayEvents(eventsForDay(cursor)), [cursor, eventsForDay]);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const nowMin = today.getHours() * 60 + today.getMinutes();
  const nowTop = (nowMin / 60) * DAY_HOUR_PX;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: "var(--text-faint)" }}
          >
            {DAYS_LONG[cursor.getDay() === 0 ? 6 : cursor.getDay() - 1]}
          </span>
          <span
            className="text-[26px] font-semibold w-11 h-11 flex items-center justify-center rounded-full"
            style={
              isToday
                ? { background: "var(--accent)", color: "white" }
                : { color: "var(--text-primary)" }
            }
          >
            {cursor.getDate()}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {laid.length} {laid.length === 1 ? "event" : "events"}
            </span>
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ paddingLeft: DAY_GUTTER_PX }}>
          {/* Hour rows */}
          {hours.map((h) => (
            <div
              key={h}
              className="relative"
              style={{
                height: DAY_HOUR_PX,
                borderTop: h === 0 ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="absolute -top-2 text-[11px] tabular-nums"
                style={{
                  color: "var(--text-faint)",
                  left: -DAY_GUTTER_PX + 12,
                  width: DAY_GUTTER_PX - 20,
                  textAlign: "right",
                }}
              >
                {h === 0 ? "" : formatTime(h)}
              </span>
              {/* half-hour guide */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: DAY_HOUR_PX / 2,
                  borderTop: "1px dashed var(--border-subtle)",
                  opacity: 0.4,
                }}
              />
            </div>
          ))}

          {/* Now indicator */}
          {isToday && (
            <div
              className="absolute left-0 right-4 z-20 pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full -ml-1"
                  style={{ background: "var(--accent)" }}
                />
                <div className="flex-1 h-px" style={{ background: "var(--accent)" }} />
              </div>
            </div>
          )}

          {/* Events overlay */}
          <div
            className="absolute inset-0 z-10"
            style={{ paddingLeft: 8, paddingRight: 16 }}
          >
            {laid.map((ev) => {
              const top = (ev.startMin / 60) * DAY_HOUR_PX;
              const height = Math.max(28, ((ev.endMin - ev.startMin) / 60) * DAY_HOUR_PX - 4);
              const widthPct = 100 / ev.laneCount;
              const leftPct = widthPct * ev.lane;
              const isDone = ev.task.status === "done";
              const timeStr = ev.date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div
                  key={ev.task.id}
                  className="absolute rounded-md px-2 py-1.5 cursor-pointer transition-all hover:brightness-110 overflow-hidden"
                  style={{
                    top,
                    height,
                    left: `calc(${leftPct}% + ${ev.lane === 0 ? 0 : 2}px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    background: ev.color + "1F",
                    borderLeft: `3px solid ${ev.color}`,
                    opacity: isDone ? 0.5 : 1,
                  }}
                  title={ev.task.title}
                >
                  <div
                    className="text-[12px] font-semibold leading-tight truncate"
                    style={{
                      color: ev.color,
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {ev.task.title}
                  </div>
                  {height > 32 && (
                    <div
                      className="text-[11px] mt-0.5 tabular-nums"
                      style={{ color: ev.color, opacity: 0.75 }}
                    >
                      {timeStr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {laid.length === 0 && (
          <div className="absolute inset-x-0 top-32 flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-[13px]" style={{ color: "var(--text-faint)" }}>
              No events scheduled
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List View (Upcoming style) ───────────────────────────────────────────────

function ListView({ cursor, events }: { cursor: Date; events: CalendarEvent[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Overdue: events before today
  const overdueEvents = events.filter((e) => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  // Future: today + 13 more days
  const futureDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const grouped = futureDays.map((day) => ({
    day,
    events: events.filter((e) => isSameDay(e.date, day)),
  }));

  // Week strip: Mon–Sun of cursor week
  const ws = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  function dayLabel(day: Date) {
    if (isSameDay(day, today)) return "Today";
    if (isSameDay(day, addDays(today, 1))) return "Tomorrow";
    return DAYS_LONG[day.getDay() === 0 ? 6 : day.getDay() - 1];
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Upcoming header */}
      <div className="px-8 pt-7 pb-0 shrink-0">
        <h2 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
          Upcoming
        </h2>
        {/* Month + week strip */}
        <div className="flex items-center justify-between mt-3 mb-0">
          <button className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 mt-3 pb-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  {DAYS_SHORT[i]}
                </span>
                <span
                  className="text-[14px] font-semibold w-7 h-7 flex items-center justify-center rounded-full"
                  style={isToday
                    ? { background: "var(--accent)", color: "white" }
                    : { color: "var(--text-secondary)" }
                  }
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-0">

        {/* Overdue section */}
        {overdueEvents.length > 0 && (
          <UpcomingSection
            label="Overdue"
            labelColor="var(--error)"
            action={{ label: "Reschedule", color: "var(--error)" }}
            events={overdueEvents}
            showTime
          />
        )}

        {/* Daily sections */}
        {grouped.map(({ day, events: dayEvents }) => {
          const isToday = isSameDay(day, today);
          const isTomorrow = isSameDay(day, addDays(today, 1));
          const label = dayLabel(day);
          const dateStr = `${day.getDate()} ${MONTHS[day.getMonth()].slice(0, 3)}`;
          const fullLabel = isToday
            ? `${dateStr} · Today · ${DAYS_LONG[day.getDay() === 0 ? 6 : day.getDay() - 1]}`
            : isTomorrow
            ? `${dateStr} · Tomorrow · ${DAYS_LONG[day.getDay() === 0 ? 6 : day.getDay() - 1]}`
            : `${dateStr} · ${label}`;

          return (
            <UpcomingSection
              key={day.toISOString()}
              label={fullLabel}
              labelColor={isToday ? "var(--text-primary)" : "var(--text-muted)"}
              events={dayEvents}
              showTime
              showAddTask
            />
          );
        })}
      </div>
    </div>
  );
}

function UpcomingSection({
  label,
  labelColor,
  action,
  events: sectionEvents,
  showTime,
  showAddTask,
}: {
  label: string;
  labelColor: string;
  action?: { label: string; color: string };
  events: CalendarEvent[];
  showTime?: boolean;
  showAddTask?: boolean;
}) {
  return (
    <div className="mb-2">
      {/* Section header */}
      <div
        className="flex items-center justify-between py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="text-[14px] font-semibold" style={{ color: labelColor }}>
          {label}
        </span>
        {action && (
          <button className="text-[13px] font-medium" style={{ color: action.color }}>
            {action.label}
          </button>
        )}
      </div>

      {/* Task rows */}
      {sectionEvents.map((ev) => (
        <UpcomingTaskRow key={ev.task.id} ev={ev} showTime={showTime} />
      ))}

      {/* Add task */}
      {showAddTask && (
        <button
          className="flex items-center gap-2 py-2.5 w-full text-left transition-opacity hover:opacity-80"
          style={{ color: "var(--text-faint)" }}
        >
          <Plus size={14} />
          <span className="text-[13px]">Add task</span>
        </button>
      )}
    </div>
  );
}

function UpcomingTaskRow({ ev, showTime }: { ev: CalendarEvent; showTime?: boolean }) {
  const timeStr = ev.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isDone = ev.task.status === "done";

  return (
    <div
      className="flex items-start gap-3 py-2.5 group cursor-pointer"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Checkbox */}
      <button
        className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
        style={{
          borderColor: isDone ? "var(--success)" : "var(--text-faint)",
          background: isDone ? "var(--success)" : "transparent",
        }}
        aria-label="Toggle task"
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className="text-[14px] block"
          style={{
            color: isDone ? "var(--text-faint)" : "var(--text-primary)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {ev.task.title}
        </span>
        {showTime && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--error)" }}>
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="text-[12px]" style={{ color: "var(--error)" }}>{timeStr}</span>
          </div>
        )}
      </div>

      {/* Right: project tag */}
      <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
        <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>Inbox</span>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function EventPill({ ev, compact }: { ev: CalendarEvent; compact?: boolean }) {
  const statusStyle: Record<string, string> = {
    todo: "opacity-70",
    in_progress: "opacity-100",
    done: "opacity-40 line-through",
  };

  return (
    <div
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-medium truncate cursor-pointer transition-opacity hover:opacity-80",
        compact ? "absolute inset-x-0.5 top-0.5" : "w-full",
        statusStyle[ev.task.status]
      )}
      style={{
        background: ev.color + "26",
        color: ev.color,
        borderLeft: `2px solid ${ev.color}`,
      }}
      title={ev.task.title}
    >
      {ev.task.title}
    </div>
  );
}


function weekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
