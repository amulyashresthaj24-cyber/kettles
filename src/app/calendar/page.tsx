"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  CaretLeft,
  CaretRight,
  Plus,
  CalendarBlank as CalIcon,
  List,
  SquaresFour as LayoutGrid,
  AlignLeft as AlignJustify,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { taskDateTimestamp } from "@/lib/task-dates";
import { AddTaskModal } from "@/components/AddTaskModal";
import { TaskDetailSidebar } from "@/components/TaskDetailSidebar";
import { Button } from "@/components/ui/button";
import type { Task, ProjectColor, GoogleCalendarEvent } from "@/lib/types";
import { PROJECT_COLOR_HEX } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "week" | "month" | "day" | "list";

interface CalendarEvent {
  task: Task;
  date: Date;
  color: string;
  projectName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProjectColor(color: string) {
  return PROJECT_COLOR_HEX[color as ProjectColor] ?? "var(--text-muted)";
}

const URGENCY_RING: Record<string, string | null> = {
  urgent: "var(--error)",
  high: "#f59e0b",
  normal: null,
  low: "rgba(98,102,109,0.4)",
};

function urgencyOutlineStyle(urgency: string): React.CSSProperties {
  const ring = URGENCY_RING[urgency];
  return ring ? { outline: `2px solid ${ring}`, outlineOffset: "1px" } : {};
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

/** Local start for a Google event. All-day uses startDate (not startsAt / UTC midnight). */
function googleLocalStart(ev: GoogleCalendarEvent): Date | null {
  if (ev.allDay) {
    if (!ev.startDate) return null;
    const [y, m, d] = ev.startDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(ev.startsAt);
}

/** Local end. All-day endDate is exclusive (day after last day of the event). */
function googleLocalEnd(ev: GoogleCalendarEvent): Date | null {
  if (ev.allDay) {
    if (!ev.endDate) {
      const start = googleLocalStart(ev);
      return start ? addDays(start, 1) : null;
    }
    const [y, m, d] = ev.endDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(ev.endsAt);
}

function googleEventOnDay(ev: GoogleCalendarEvent, day: Date): boolean {
  if (ev.allDay) {
    const start = googleLocalStart(ev);
    const end = googleLocalEnd(ev);
    if (!start || !end) return false;
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return dayStart >= start && dayStart < end;
  }
  return isSameDay(new Date(ev.startsAt), day);
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
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "week";
    return (localStorage.getItem("flowmate-calendar-view") as ViewMode) ?? "week";
  });
  const [cursor, setCursor] = useState(new Date());
  const [openAddTask, setOpenAddTask] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string>("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "todo" | "doing" | "done">("all");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const tasks = useApp((s) => s.tasks);
  const projects = useApp((s) => s.projects);
  const activeSessionId = useApp((s) => s.activeSessionId);
  const sessions = useApp((s) => s.sessions);
  const selectedTaskId = useApp((s) => s.selectedTaskId);
  const setSelectedTaskId = useApp((s) => s.setSelectedTaskId);
  const googleEvents = useApp((s) => s.googleEvents);
  const googleCalendarError = useApp((s) => s.googleCalendarError);
  const loadGoogleEvents = useApp((s) => s.loadGoogleEvents);
  const googleCalendarLoaded = useApp((s) => s.googleCalendarLoaded);
  const googleConnected = useApp((s) => s.googleCalendar?.connected ?? false);
  const loadGoogleCalendarStatus = useApp((s) => s.loadGoogleCalendarStatus);
  const statusRequested = useRef(false);
  const activeTaskId = sessions.find((s) => s.id === activeSessionId)?.taskId ?? null;

  const handleOpenAddTask = (date?: Date) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setSelectedDateRange(`${yyyy}-${mm}-${dd}`);
    } else {
      setSelectedDateRange("");
    }
    setEditingTask(null);
    setOpenAddTask(true);
  };

  useEffect(() => {
    if (!projectDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectDropdownOpen]);

  function changeView(v: ViewMode) {
    setView(v);
    localStorage.setItem("flowmate-calendar-view", v);
  }

  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter((t) => !t.archived && !t.deletedAt)
      .filter((t) => filterProject === "all" || t.projectId === filterProject)
      .filter((t) => filterStatus === "all" || t.status === filterStatus)
      .map((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        return {
          task: t,
          date: new Date(taskDateTimestamp(t)),
          color: getProjectColor(project?.color ?? ""),
          projectName: project?.name?.trim() || "Unassigned",
        };
      });
  }, [tasks, projects, filterProject, filterStatus]);

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(e.date, day));
  }

  function googleEventsForDay(day: Date) {
    return googleEvents.filter((g) => googleEventOnDay(g, day));
  }

  // Fetch Google overlay for the visible window. Store skips redundant ranges.
  const visibleRange = useMemo(() => {
    if (view === "day") {
      const start = new Date(cursor);
      start.setHours(0, 0, 0, 0);
      return { startMs: start.getTime(), endMs: addDays(start, 1).getTime() };
    }
    if (view === "week") {
      const start = startOfWeek(cursor);
      return { startMs: start.getTime(), endMs: addDays(start, 7).getTime() };
    }
    if (view === "month") {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const start = startOfWeek(first);
      return { startMs: start.getTime(), endMs: addDays(start, 42).getTime() };
    }
    // list: today → +14 days
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { startMs: start.getTime(), endMs: addDays(start, 15).getTime() };
  }, [view, cursor]);

  // Settings also loads this, but /calendar is just as likely to be the first
  // page a user lands on. Without it `googleCalendar` stays undefined and
  // loadGoogleEvents returns early — a connected user would see an empty
  // overlay with no indication anything was wrong.
  useEffect(() => {
    if (statusRequested.current || googleCalendarLoaded) return;
    statusRequested.current = true;
    void loadGoogleCalendarStatus();
  }, [googleCalendarLoaded, loadGoogleCalendarStatus]);

  // Depends on googleConnected too: the status call above resolves after mount,
  // so without it the fetch would not re-run and events would only appear after
  // the next view change.
  useEffect(() => {
    if (!googleConnected) return;
    void loadGoogleEvents(visibleRange.startMs, visibleRange.endMs);
  }, [visibleRange, loadGoogleEvents, googleConnected]);

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

  const STATUS_FILTERS: { id: typeof filterStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "todo", label: "To-Do" },
    { id: "doing", label: "In Progress" },
    { id: "done", label: "Done" },
  ];

  return (
    <div className="no-shell-padding flex flex-col h-full overflow-hidden" style={{ background: "var(--base)", color: "var(--text-primary)" }}>
      {/* Header block — matches PageHeader + PageToolbar pattern used in Tasks/Report pages */}
      <div
        className="shrink-0 flex flex-col"
        style={{
          paddingLeft: "32px",
          paddingRight: "32px",
          paddingTop: "32px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--border-subtle)",
          gap: "12px",
        }}
      >
        {/* Row 1 — PageHeader: title + subtitle + primary action */}
        <header className="flex items-center justify-between" style={{ gap: "var(--header-gap)" }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1
              className="font-semibold text-text-primary"
              style={{
                fontSize: "var(--heading-xl-size)",
                fontWeight: "var(--heading-xl-weight)",
                lineHeight: "var(--heading-xl-line-height)",
                letterSpacing: "var(--heading-xl-letter-spacing)",
              }}
            >
              Calendar
            </h1>
            <p className="text-text-muted" style={{ fontSize: "var(--body-sm-size)" }}>
              {headerLabel()}
            </p>
          </div>
          <Button variant="primary" size="default" onClick={() => handleOpenAddTask()}>
            <Plus size={14} />
            Add Task
          </Button>
        </header>

        {/* Row 2 — PageToolbar: left navigation + filters | right view switcher */}
        <div className="flex items-center justify-between" style={{ gap: "var(--toolbar-gap)" }}>
          {/* Left: nav arrows + Today + status filter pills */}
          <div className="flex items-center" style={{ gap: "var(--component-gap)" }}>
            {/* Date nav */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navigate(-1)}
                aria-label="Previous"
                className="w-7 h-7 flex items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--surface-raised)]"
                style={{ color: "var(--text-muted)" }}
              >
                <CaretLeft size={15} />
              </button>
              <button
                onClick={() => navigate(1)}
                aria-label="Next"
                className="w-7 h-7 flex items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--surface-raised)]"
                style={{ color: "var(--text-muted)" }}
              >
                <CaretRight size={15} />
              </button>
            </div>

            <button
              onClick={() => setCursor(new Date())}
              className="px-3 h-7 text-[12px] font-medium rounded-[8px] transition-colors hover:opacity-80"
              style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
            >
              Today
            </button>

            {/* Divider */}
            <div className="w-px h-5 shrink-0" style={{ background: "var(--border-subtle)" }} />

            {/* Status filter pills */}
            <div
              className="flex items-center rounded-[8px] p-0.5 gap-0.5"
              style={{ background: "var(--surface-raised)" }}
            >
              {STATUS_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterStatus(id)}
                  className="px-3 h-7 text-[12px] font-medium rounded-[6px] transition-all"
                  style={{
                    background: filterStatus === id ? "var(--surface-mid)" : "transparent",
                    color: filterStatus === id ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Project filter */}
            <div className="relative" ref={projectDropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium rounded-[8px] transition-colors hover:opacity-80"
                style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
              >
                {filterProject === "all"
                  ? "All projects"
                  : (projects.find((p) => p.id === filterProject)?.name ?? "All projects")}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "var(--text-muted)" }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {projectDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 min-w-[140px] rounded-lg bg-surface-raised border border-border-subtle shadow-2xl z-[100] overflow-hidden animate-dropdown-in">
                  <div className="p-1">
                    <button
                      onClick={() => { setFilterProject("all"); setProjectDropdownOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-surface-mid"
                      style={{ color: filterProject === "all" ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      All projects
                    </button>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setFilterProject(p.id); setProjectDropdownOpen(false); }}
                        className="w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-surface-mid flex items-center gap-2"
                        style={{ color: filterProject === p.id ? "var(--accent)" : "var(--text-primary)" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: getProjectColor(p.color) }}
                        />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: view switcher */}
          <div
            className="flex items-center rounded-[8px] p-0.5 gap-0.5"
            style={{ background: "var(--surface-raised)" }}
            role="group"
            aria-label="View mode"
          >
            {VIEW_TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => changeView(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded-[8px] transition-all",
                  view === id
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                style={view === id ? { background: "var(--surface-mid)" } : {}}
                aria-pressed={view === id}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-6">
        {googleCalendarError === "reconnect_required" && (
          <p className="text-[12px] shrink-0 pt-2" style={{ color: "var(--text-muted)" }}>
            Google Calendar needs reconnection.{" "}
            <a href="/settings" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--accent)" }}>
              Open settings
            </a>
          </p>
        )}
        {view === "week" && (
          <WeekView
            cursor={cursor}
            eventsForDay={eventsForDay}
            googleEventsForDay={googleEventsForDay}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onSlotClick={(day) => handleOpenAddTask(day)}
            activeTaskId={activeTaskId}
          />
        )}
        {view === "month" && (
          <MonthView
            cursor={cursor}
            eventsForDay={eventsForDay}
            googleEventsForDay={googleEventsForDay}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onDayClick={(day) => handleOpenAddTask(day)}
            activeTaskId={activeTaskId}
          />
        )}
        {view === "day" && (
          <DayView
            cursor={cursor}
            eventsForDay={eventsForDay}
            googleEventsForDay={googleEventsForDay}
            onTaskClick={(id) => setSelectedTaskId(id)}
            activeTaskId={activeTaskId}
          />
        )}
        {view === "list" && (
          <ListView
            cursor={cursor}
            events={events}
            googleEventsForDay={googleEventsForDay}
            onAddTask={(day) => handleOpenAddTask(day)}
            onTaskClick={(id) => setSelectedTaskId(id)}
            activeTaskId={activeTaskId}
          />
        )}
      </div>

      {/* Task detail sidebar */}
      <TaskDetailSidebar
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onEditTask={(task) => {
          setEditingTask(task);
          setOpenAddTask(true);
        }}
      />

      <AddTaskModal
        open={openAddTask}
        onClose={() => {
          setOpenAddTask(false);
          setEditingTask(null);
        }}
        editingTask={editingTask}
        defaultDateRange={selectedDateRange}
      />
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

/**
 * Week cells are one hour tall and their pills are `absolute inset-x-0.5`, so
 * everything in the same hour lands on the same pixels — the last one painted
 * hides the rest. Split the cell into equal-width lanes instead.
 *
 * `right: auto` is required: `inset-x-0.5` sets both left and right, and a left
 * plus width with a stale right would resolve to the wrong box.
 */
function weekLaneStyle(index: number, total: number): React.CSSProperties {
  if (total <= 1) return {};
  const pct = 100 / total;
  return {
    left: `calc(${index * pct}% + 2px)`,
    width: `calc(${pct}% - 4px)`,
    right: "auto",
  };
}

function WeekView({
  cursor,
  eventsForDay,
  googleEventsForDay,
  onTaskClick,
  onSlotClick,
  activeTaskId,
}: {
  cursor: Date;
  eventsForDay: (d: Date) => CalendarEvent[];
  googleEventsForDay: (d: Date) => GoogleCalendarEvent[];
  onTaskClick: (taskId: string) => void;
  onSlotClick: (day: Date, hour: number) => void;
  activeTaskId: string | null;
}) {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const today = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAllDay = days.some((d) => googleEventsForDay(d).some((g) => g.allDay));

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const targetPx = Math.max(0, (nowMin / 60) * 56 - scrollRef.current.clientHeight / 3);
    scrollRef.current.scrollTop = targetPx;
  }, []);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ border: "1px solid var(--border-subtle)", borderRadius: 4, marginTop: 12 }}
    >
      {/* Day headers */}
      <div
        className="grid shrink-0"
        style={{
          gridTemplateColumns: "56px repeat(7, 1fr)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="h-12" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className="h-12 flex flex-col items-center justify-center gap-0.5"
              style={{ borderLeft: "1px solid var(--border-subtle)" }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                {DAYS_SHORT[i]}
              </span>
              <span
                className={cn(
                  "text-[14px] font-semibold w-7 h-7 flex items-center justify-center rounded-full",
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

      {/* All-day Google events strip */}
      {hasAllDay && (
        <div
          className="grid shrink-0"
          style={{
            gridTemplateColumns: "56px repeat(7, 1fr)",
            borderBottom: "1px solid var(--border-subtle)",
            minHeight: 28,
          }}
        >
          <div className="flex items-start justify-end pr-2 pt-1.5">
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>All day</span>
          </div>
          {days.map((day, di) => {
            const allDay = googleEventsForDay(day).filter((g) => g.allDay);
            return (
              <div
                key={`allday-${di}`}
                className="flex flex-col gap-0.5 px-0.5 py-1 overflow-hidden"
                style={{ borderLeft: "1px solid var(--border-subtle)" }}
              >
                {allDay.map((g) => (
                  <GoogleEventPill key={g.id} g={g} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {hours.map((h) => (
            <>
              <div
                key={`label-${h}`}
                className="h-14 flex items-start justify-end pr-2 pt-1 shrink-0"
                style={{ color: "var(--text-faint)", borderTop: h > 0 ? "1px solid var(--border-subtle)" : undefined }}
              >
                <span className="text-[10px]">{h > 0 ? formatTime(h) : ""}</span>
              </div>
              {days.map((day, di) => {
                const dayEvents = eventsForDay(day).filter((e) => e.date.getHours() === h);
                const googleTimed = googleEventsForDay(day).filter(
                  (g) => !g.allDay && new Date(g.startsAt).getHours() === h
                );
                const laneCount = dayEvents.length + googleTimed.length;
                return (
                  <div
                    key={`cell-${h}-${di}`}
                    className="h-14 relative cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
                    style={{
                      borderLeft: "1px solid var(--border-subtle)",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                    onClick={() => dayEvents.length === 0 && googleTimed.length === 0 && onSlotClick(day, h)}
                  >
                    {dayEvents.map((ev, ei) => (
                      <EventPill
                        key={ev.task.id}
                        ev={ev}
                        compact
                        style={weekLaneStyle(ei, laneCount)}
                        activeTaskId={activeTaskId}
                        onClick={() => onTaskClick(ev.task.id)}
                      />
                    ))}
                    {googleTimed.map((g, gi) => (
                      <GoogleEventPill
                        key={g.id}
                        g={g}
                        compact
                        style={weekLaneStyle(dayEvents.length + gi, laneCount)}
                      />
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

function MonthView({
  cursor,
  eventsForDay,
  googleEventsForDay,
  onTaskClick,
  onDayClick,
  activeTaskId,
}: {
  cursor: Date;
  eventsForDay: (d: Date) => CalendarEvent[];
  googleEventsForDay: (d: Date) => GoogleCalendarEvent[];
  onTaskClick: (taskId: string) => void;
  onDayClick: (day: Date) => void;
  activeTaskId: string | null;
}) {
  const today = new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = startOfWeek(firstDay);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(startDay, i));

  const weeks = 6;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 4,
        marginTop: 12,
      }}
    >
      {/* Day headers */}
      <div
        className="grid grid-cols-7 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {DAYS_SHORT.map((d, i) => (
          <div
            key={d}
            className="h-9 flex items-center justify-center"
            style={{ borderRight: i < 6 ? "1px solid var(--border-subtle)" : undefined }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Grid — flex-1 so it fills remaining height, no scroll */}
      <div
        className="flex-1 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}
      >
        {cells.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === month;
          const dayEvents = eventsForDay(day);
          const dayGoogle = googleEventsForDay(day);
          const totalLines = dayEvents.length + dayGoogle.length;
          // Prefer showing a mix: tasks first, then Google, capped at 2 lines.
          const taskShow = dayEvents.slice(0, 2);
          const googleShow = dayGoogle.slice(0, Math.max(0, 2 - taskShow.length));
          const col = i % 7;
          const row = Math.floor(i / 7);
          return (
            <div
              key={i}
              className="relative p-1.5 flex flex-col gap-1 overflow-hidden cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
              style={{
                borderRight: col < 6 ? "1px solid var(--border-subtle)" : undefined,
                borderBottom: row < weeks - 1 ? "1px solid var(--border-subtle)" : undefined,
              }}
              onClick={() => dayEvents.length === 0 && dayGoogle.length === 0 && onDayClick(day)}
            >
              <span
                className={cn(
                  "text-[12px] font-medium w-5 h-5 flex items-center justify-center rounded-full self-end shrink-0",
                  isToday ? "text-white" : isCurrentMonth ? "text-[var(--text-primary)]" : "text-[var(--text-faint)]"
                )}
                style={isToday ? { background: "var(--accent)" } : {}}
              >
                {day.getDate()}
              </span>
              {taskShow.map((ev) => (
                <EventPill
                  key={ev.task.id}
                  ev={ev}
                  activeTaskId={activeTaskId}
                  onClick={() => onTaskClick(ev.task.id)}
                />
              ))}
              {googleShow.map((g) => (
                <GoogleEventPill key={g.id} g={g} />
              ))}
              {totalLines > 2 && (
                <span className="text-[10px] px-1" style={{ color: "var(--text-faint)" }}>+{totalLines - 2}</span>
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

type LaidOutTask = CalendarEvent & {
  kind: "task";
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

type LaidOutGoogle = {
  kind: "google";
  g: GoogleCalendarEvent;
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

type LaidOutEvent = LaidOutTask | LaidOutGoogle;

function layoutDayEvents(
  evs: CalendarEvent[],
  googleTimed: GoogleCalendarEvent[] = []
): LaidOutEvent[] {
  type Seed =
    | { kind: "task"; cal: CalendarEvent; startMin: number; endMin: number }
    | { kind: "google"; g: GoogleCalendarEvent; startMin: number; endMin: number };

  const items: Seed[] = [
    ...evs.map((e) => {
      const startMin = e.date.getHours() * 60 + e.date.getMinutes();
      const dur = Math.max(30, e.task.estimateMinutes ?? 60);
      return { kind: "task" as const, cal: e, startMin, endMin: Math.min(24 * 60, startMin + dur) };
    }),
    ...googleTimed.map((g) => {
      const s = new Date(g.startsAt);
      const e = new Date(g.endsAt);
      const startMin = s.getHours() * 60 + s.getMinutes();
      let endMin = e.getHours() * 60 + e.getMinutes();
      if (!isSameDay(s, e)) endMin = 24 * 60;
      else if (endMin <= startMin) endMin = startMin + 30;
      return {
        kind: "google" as const,
        g,
        startMin,
        endMin: Math.min(24 * 60, endMin),
      };
    }),
  ].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: LaidOutEvent[] = [];
  let cluster: Seed[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const lanes: number[] = [];
    const placed: { item: Seed; lane: number }[] = [];
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
    placed.forEach(({ item, lane }) => {
      if (item.kind === "task") {
        out.push({ ...item.cal, kind: "task", startMin: item.startMin, endMin: item.endMin, lane, laneCount });
      } else {
        out.push({ kind: "google", g: item.g, startMin: item.startMin, endMin: item.endMin, lane, laneCount });
      }
    });
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

function DayView({
  cursor,
  eventsForDay,
  googleEventsForDay,
  onTaskClick,
  activeTaskId,
}: {
  cursor: Date;
  eventsForDay: (d: Date) => CalendarEvent[];
  googleEventsForDay: (d: Date) => GoogleCalendarEvent[];
  onTaskClick: (taskId: string) => void;
  activeTaskId: string | null;
}) {
  const today = new Date();
  const isToday = isSameDay(cursor, today);
  const dayGoogle = googleEventsForDay(cursor);
  const allDayGoogle = dayGoogle.filter((g) => g.allDay);
  const laid = useMemo(
    () =>
      layoutDayEvents(
        eventsForDay(cursor),
        googleEventsForDay(cursor).filter((g) => !g.allDay)
      ),
    [cursor, eventsForDay, googleEventsForDay]
  );
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setTaskStatus = useApp((s) => s.setTaskStatus);

  const nowMin = today.getHours() * 60 + today.getMinutes();
  const nowTop = (nowMin / 60) * DAY_HOUR_PX;
  const totalCount = laid.length + allDayGoogle.length;

  useEffect(() => {
    if (!scrollRef.current) return;
    const targetPx = Math.max(0, (nowMin / 60) * DAY_HOUR_PX - scrollRef.current.clientHeight / 3);
    scrollRef.current.scrollTop = targetPx;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
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
            style={isToday ? { background: "var(--accent)", color: "white" } : { color: "var(--text-primary)" }}
          >
            {cursor.getDate()}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {totalCount} {totalCount === 1 ? "event" : "events"}
            </span>
          </div>
        </div>
      </div>

      {/* All-day Google events strip */}
      {allDayGoogle.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5 px-8 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: "var(--text-faint)" }}>
            All day
          </span>
          {allDayGoogle.map((g) => (
            <div key={g.id} className="max-w-[240px]">
              <GoogleEventPill g={g} />
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ paddingLeft: DAY_GUTTER_PX }}>
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
              <div
                className="absolute left-0 right-0"
                style={{ top: DAY_HOUR_PX / 2, borderTop: "1px dashed var(--border-subtle)", opacity: 0.4 }}
              />
            </div>
          ))}

          {isToday && (
            <div className="absolute left-0 right-4 z-20 pointer-events-none" style={{ top: nowTop }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full -ml-1" style={{ background: "var(--accent)" }} />
                <div className="flex-1 h-px" style={{ background: "var(--accent)" }} />
              </div>
            </div>
          )}

          <div className="absolute inset-0 z-10" style={{ paddingLeft: 8, paddingRight: 16 }}>
            {laid.map((item) => {
              const top = (item.startMin / 60) * DAY_HOUR_PX;
              const height = Math.max(28, ((item.endMin - item.startMin) / 60) * DAY_HOUR_PX - 4);
              const widthPct = 100 / item.laneCount;
              const leftPct = widthPct * item.lane;
              const posStyle: React.CSSProperties = {
                top,
                height,
                left: `calc(${leftPct}% + ${item.lane === 0 ? 0 : 2}px)`,
                width: `calc(${widthPct}% - 4px)`,
              };

              if (item.kind === "google") {
                const declined = item.g.responseStatus === "declined";
                const timeStr = new Date(item.g.startsAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const title = item.g.title || "(No title)";
                const googleBlock = (
                  <>
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className="shrink-0 text-[9px] font-bold leading-none"
                        style={{ color: "var(--accent)" }}
                        aria-hidden
                      >
                        G
                      </span>
                      <div
                        className="text-[12px] font-semibold leading-tight truncate"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {title}
                      </div>
                    </div>
                    {height > 32 && (
                      <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {timeStr}
                      </div>
                    )}
                  </>
                );
                const googleStyle: React.CSSProperties = {
                  ...posStyle,
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent-border)",
                  opacity: declined ? 0.4 : 1,
                };
                if (item.g.url) {
                  return (
                    <a
                      key={item.g.id}
                      href={item.g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute rounded-md px-2 py-1.5 overflow-hidden block"
                      style={googleStyle}
                      title={title}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {googleBlock}
                    </a>
                  );
                }
                return (
                  <div
                    key={item.g.id}
                    className="absolute rounded-md px-2 py-1.5 overflow-hidden"
                    style={googleStyle}
                    title={title}
                  >
                    {googleBlock}
                  </div>
                );
              }

              const ev = item;
              const isDone = ev.task.status === "done";
              const isActive = ev.task.id === activeTaskId;
              const timeStr = ev.date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
              return (
                <div
                  key={ev.task.id}
                  className="absolute rounded-md px-2 py-1.5 cursor-pointer transition-all hover:brightness-110 overflow-hidden group"
                  style={{
                    ...posStyle,
                    background: ev.color + "1F",
                    borderLeft: `3px solid ${ev.color}`,
                    opacity: isDone ? 0.5 : 1,
                    ...urgencyOutlineStyle(ev.task.urgency),
                  }}
                  title={ev.task.title}
                  onClick={() => onTaskClick(ev.task.id)}
                >
                  <div
                    className="text-[12px] font-semibold leading-tight truncate"
                    style={{ color: ev.color, textDecoration: isDone ? "line-through" : "none" }}
                  >
                    {ev.task.title}
                  </div>
                  {height > 32 && (
                    <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: ev.color, opacity: 0.75 }}>
                      {timeStr}
                    </div>
                  )}
                  {isActive && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-slow-pulse pointer-events-none"
                      style={{ background: "var(--success)" }}
                    />
                  )}
                  <button
                    className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: isDone ? "var(--success)" : "var(--surface-mid)",
                      transitionDuration: "var(--motion-fast)",
                    }}
                    onClick={(e) => { e.stopPropagation(); setTaskStatus(ev.task.id, isDone ? "todo" : "done"); }}
                    aria-label={isDone ? "Mark as todo" : "Mark as done"}
                  >
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  cursor,
  events,
  googleEventsForDay,
  onAddTask,
  onTaskClick,
  activeTaskId,
}: {
  cursor: Date;
  events: CalendarEvent[];
  googleEventsForDay: (d: Date) => GoogleCalendarEvent[];
  onAddTask: (day: Date) => void;
  onTaskClick: (taskId: string) => void;
  activeTaskId: string | null;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueEvents = events.filter((e) => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const futureDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const grouped = futureDays.map((day) => ({
    day,
    events: events.filter((e) => isSameDay(e.date, day)),
    google: googleEventsForDay(day),
  }));

  const ws = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  function dayLabel(day: Date) {
    if (isSameDay(day, today)) return "Today";
    if (isSameDay(day, addDays(today, 1))) return "Tomorrow";
    return DAYS_LONG[day.getDay() === 0 ? 6 : day.getDay() - 1];
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="shrink-0"
        style={{
          paddingLeft: "32px",
          paddingRight: "32px",
          paddingTop: "20px",
          paddingBottom: 0,
        }}
      >
        <h2 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
          Upcoming
        </h2>
        <div className="flex items-center justify-between mt-3 mb-0">
          <button className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            <CaretRight size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

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
                  style={isToday ? { background: "var(--accent)", color: "white" } : { color: "var(--text-secondary)" }}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto flex flex-col gap-0"
        style={{
          paddingLeft: "32px",
          paddingRight: "32px",
          paddingTop: "12px",
          paddingBottom: "24px",
        }}
      >
        {overdueEvents.length > 0 && (
          <UpcomingSection
            label="Overdue"
            labelColor="var(--error)"
            action={{ label: "Reschedule", color: "var(--error)" }}
            events={overdueEvents}
            showTime
            onTaskClick={onTaskClick}
            activeTaskId={activeTaskId}
          />
        )}

        {grouped.map(({ day, events: dayEvents, google: dayGoogle }) => {
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
              googleEvents={dayGoogle}
              showTime
              showAddTask
              onAddTask={() => onAddTask(day)}
              onTaskClick={onTaskClick}
              activeTaskId={activeTaskId}
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
  googleEvents = [],
  showTime,
  showAddTask,
  onAddTask,
  onTaskClick,
  activeTaskId,
}: {
  label: string;
  labelColor: string;
  action?: { label: string; color: string };
  events: CalendarEvent[];
  googleEvents?: GoogleCalendarEvent[];
  showTime?: boolean;
  showAddTask?: boolean;
  onAddTask?: () => void;
  onTaskClick: (taskId: string) => void;
  activeTaskId: string | null;
}) {
  type Row =
    | { kind: "task"; sort: number; ev: CalendarEvent }
    | { kind: "google"; sort: number; g: GoogleCalendarEvent };

  const rows: Row[] = [
    ...sectionEvents.map((ev) => ({ kind: "task" as const, sort: ev.date.getTime(), ev })),
    ...googleEvents.map((g) => {
      const start = googleLocalStart(g);
      // All-day sorts first (local midnight); timed use startsAt.
      const sort = start ? start.getTime() : g.startsAt;
      return { kind: "google" as const, sort, g };
    }),
  ].sort((a, b) => a.sort - b.sort);

  return (
    <div className="mb-2">
      <div
        className="flex items-center justify-between py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="text-[14px] font-semibold" style={{ color: labelColor }}>{label}</span>
        {action && (
          <button className="text-[13px] font-medium" style={{ color: action.color }}>{action.label}</button>
        )}
      </div>

      {rows.map((row) =>
        row.kind === "task" ? (
          <UpcomingTaskRow
            key={row.ev.task.id}
            ev={row.ev}
            showTime={showTime}
            onTaskClick={onTaskClick}
            activeTaskId={activeTaskId}
          />
        ) : (
          <UpcomingGoogleRow key={row.g.id} g={row.g} showTime={showTime} />
        )
      )}

      {showAddTask && (
        <button
          onClick={onAddTask}
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

function UpcomingGoogleRow({
  g,
  showTime,
}: {
  g: GoogleCalendarEvent;
  showTime?: boolean;
}) {
  const declined = g.responseStatus === "declined";
  const title = g.title || "(No title)";
  const timeStr = g.allDay
    ? "All day"
    : new Date(g.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const inner = (
    <div
      className="flex items-start gap-3 py-2.5 rounded-[6px] px-1 -mx-1"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        borderLeft: "2px solid var(--accent-border)",
        opacity: declined ? 0.4 : 1,
      }}
    >
      {/* Marker — not a status toggle (Google events are read-only) */}
      <span
        className="mt-0.5 w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
        style={{
          border: "1.5px solid var(--accent-border)",
          color: "var(--accent)",
          background: "var(--accent-dim)",
        }}
        aria-hidden
      >
        G
      </span>

      <div className="flex-1 min-w-0">
        <span className="text-[14px] block" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>
        {showTime && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--text-muted)" }}>
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{timeStr}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>Google</span>
      </div>
    </div>
  );

  if (g.url) {
    return (
      <a
        href={g.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline hover:bg-[var(--surface-raised)] transition-colors rounded-[6px]"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function UpcomingTaskRow({
  ev,
  showTime,
  onTaskClick,
  activeTaskId,
}: {
  ev: CalendarEvent;
  showTime?: boolean;
  onTaskClick: (taskId: string) => void;
  activeTaskId: string | null;
}) {
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const timeStr = ev.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isDone = ev.task.status === "done";
  const isActive = ev.task.id === activeTaskId;

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setTaskStatus(ev.task.id, isDone ? "todo" : "done");
  }

  return (
    <div
      className="flex items-start gap-3 py-2.5 group cursor-pointer hover:bg-[var(--surface-raised)] transition-colors rounded-[6px] px-1 -mx-1"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        borderLeft: isActive ? "2px solid var(--success)" : "2px solid transparent",
      }}
      onClick={() => onTaskClick(ev.task.id)}
    >
      <button
        className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
        style={{
          borderColor: isDone ? "var(--success)" : "var(--text-faint)",
          background: isDone ? "var(--success)" : "transparent",
        }}
        aria-label="Toggle task"
        onClick={handleToggle}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--text-muted)" }}>
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{timeStr}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {ev.task.urgency !== "normal" && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: URGENCY_RING[ev.task.urgency] ?? "transparent" }}
          />
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>{ev.projectName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── GoogleEventPill ──────────────────────────────────────────────────────────
// Outlined/tint + leading "G" so Google items never read as Kettles tasks.

function GoogleEventPill({
  g,
  compact,
  style,
}: {
  g: GoogleCalendarEvent;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const declined = g.responseStatus === "declined";
  const title = g.title || "(No title)";
  const className = cn(
    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium truncate no-underline",
    compact ? "absolute inset-x-0.5 top-0.5" : "w-full",
    declined && "opacity-40"
  );
  const pillStyle: React.CSSProperties = {
    background: "var(--accent-dim)",
    color: "var(--text-secondary)",
    border: "1px solid var(--accent-border)",
    ...style,
  };
  const body = (
    <>
      <span
        className="shrink-0 text-[9px] font-bold leading-none"
        style={{ color: "var(--accent)" }}
        aria-hidden
      >
        G
      </span>
      <span className="truncate">{title}</span>
    </>
  );

  if (g.url) {
    return (
      <a
        href={g.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={pillStyle}
        title={title}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </a>
    );
  }
  return (
    <div className={className} style={pillStyle} title={title}>
      {body}
    </div>
  );
}

// ─── EventPill ────────────────────────────────────────────────────────────────

function EventPill({
  ev,
  compact,
  onClick,
  activeTaskId,
  style,
}: {
  ev: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
  activeTaskId: string | null;
  style?: React.CSSProperties;
}) {
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const isDone = ev.task.status === "done";
  const isActive = ev.task.id === activeTaskId;

  const statusOpacity: Record<string, string> = {
    todo: "opacity-70",
    doing: "opacity-100",
    done: "opacity-40",
  };

  return (
    <div
      className={cn(
        "group relative rounded px-1.5 py-0.5 text-[11px] font-medium truncate cursor-pointer transition-opacity hover:opacity-80",
        compact ? "absolute inset-x-0.5 top-0.5" : "w-full",
        statusOpacity[ev.task.status],
        isDone && "line-through"
      )}
      style={{
        background: ev.color + "26",
        color: ev.color,
        borderLeft: `2px solid ${ev.color}`,
        ...urgencyOutlineStyle(ev.task.urgency),
        ...style,
      }}
      title={ev.task.title}
      onClick={onClick}
    >
      {ev.task.title}

      <button
        className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: isDone ? "var(--success)" : "var(--surface-mid)",
          transitionDuration: "var(--motion-fast)",
        }}
        onClick={(e) => { e.stopPropagation(); setTaskStatus(ev.task.id, isDone ? "todo" : "done"); }}
        aria-label={isDone ? "Mark as todo" : "Mark as done"}
      >
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isActive && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full animate-slow-pulse pointer-events-none"
          style={{ background: "var(--success)" }}
        />
      )}
    </div>
  );
}

function weekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
