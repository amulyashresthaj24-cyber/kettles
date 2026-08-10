"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Briefcase,
  CalendarBlank,
  CaretLeft,
  CheckCircle,
  Clock,
  CurrencyDollar,
  DotsThreeVertical,
  FolderOpen,
  Lock,
  LockOpen,
  PencilSimple,
  Plus,
  Tag,
  Target,
  User,
} from "@/components/ui/icon";
import type { Client, Project, ProjectStatus, ProjectColor, Session, Task, TaskStatus } from "@/lib/types";
import { useApp } from "@/lib/store-supabase";
import { earningsCents, formatHourlyRate, parseRateInput, resolveHourlyRate } from "@/lib/rates";
import { PROJECT_COLOR_CLASSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddTaskModal } from "@/components/AddTaskModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskList } from "@/components/TaskList";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

type TabId = "overview" | "tasks" | "board";

interface ProjectWorkspaceProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_BADGE_VARIANT: Record<ProjectStatus, "success" | "warning" | "accent" | "raised"> = {
  active: "success",
  paused: "warning",
  completed: "accent",
  archived: "raised",
};

const TASK_STATUS_BADGE_VARIANT: Record<TaskStatus, "raised" | "accent" | "success"> = {
  todo: "raised",
  doing: "accent",
  done: "success",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

export function ProjectWorkspace({ project, tasks, onBack }: ProjectWorkspaceProps) {
  const { updateProject, clients, user } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const projectTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const client = useMemo(
    () => clients.find((c) => !!project.clientId && c.id === project.clientId),
    [clients, project.clientId]
  );
  const isPrivate = !project.tags?.includes("public");
  const status = project.status ?? "active";

  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    overview: null,
    tasks: null,
    board: null,
  });
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.clientWidth,
        });
      }
    };

    updateIndicator();
    // Use window resize + setTimeout to make sure layouts have settled
    const handleResize = () => {
      requestAnimationFrame(updateIndicator);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  const handlePrivacyChange = async (nextPrivate: boolean) => {
    const currentTags = project.tags ?? [];
    const nextTags = nextPrivate
      ? currentTags.filter((tag) => tag !== "public")
      : Array.from(new Set([...currentTags, "public"]));
    await updateProject(project.id, { tags: nextTags });
  };

  const handleAddTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const currentTags = project.tags ?? [];
    if (!currentTags.includes(trimmed)) {
      await updateProject(project.id, { tags: [...currentTags, trimmed] });
    }
    setNewTag("");
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "board", label: "Board" },
  ];

  return (
    <div className="no-shell-padding flex h-full flex-col overflow-hidden bg-base">
      <header className="flex items-center justify-between border-b border-border-subtle bg-base px-lg py-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-ring"
            aria-label="Back to projects"
          >
            <CaretLeft size={18} />
          </button>

          <div className="flex min-w-0 items-center gap-md">
            <span className={cn("h-3 w-3 rounded-full", getColorClass(project.color))} />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-text-primary">{project.name}</h1>
              <p className="truncate text-xs text-text-muted">
                {client?.name ?? "No client"} · {project.billable ? "Billable" : "Internal"} · {STATUS_LABELS[status]}
              </p>
            </div>
          </div>

          <Badge className="ml-sm" variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
        </div>

        <div className="flex items-center gap-sm">
          <span className="hidden items-center gap-xs rounded-md bg-surface-raised px-sm py-xs text-xs text-text-secondary md:flex">
            <User size={13} />
            {user?.name ?? "Owner"}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setEditProjectOpen(true)}>
            <PencilSimple size={14} />
            Edit
          </Button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-ring"
            aria-label="Project actions"
          >
            <DotsThreeVertical size={16} />
          </button>
        </div>
      </header>

      <nav className="relative flex items-center gap-2xl border-b border-border-subtle bg-base px-lg" aria-label="Project sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-0 py-md text-sm font-medium transition-colors focus-ring",
              activeTab === tab.id ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
        <span
          className="absolute bottom-0 h-0.5 bg-accent transition-all duration-300 ease-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </nav>

      <main className="flex-1 overflow-hidden bg-base">
        <TabContent
          activeTab={activeTab}
          project={project}
          client={client}
          tasks={projectTasks}
          ownerName={user?.name ?? "Owner"}
          isPrivate={isPrivate}
          newTag={newTag}
          onNewTagChange={setNewTag}
          onAddTag={handleAddTag}
          onAddTask={() => setAddTaskOpen(true)}
          onEditTask={(task) => {
            setEditingTask(task);
            setAddTaskOpen(true);
          }}
          onEditProject={() => setEditProjectOpen(true)}
          onPrivacyChange={handlePrivacyChange}
          onUpdateProject={updateProject}
        />
      </main>

      <AddTaskModal
        open={addTaskOpen}
        onClose={() => {
          setAddTaskOpen(false);
          setEditingTask(null);
        }}
        defaultProjectId={project.id}
        editingTask={editingTask}
      />
      <EditProjectModal open={editProjectOpen} onClose={() => setEditProjectOpen(false)} project={project} />
    </div>
  );
}

interface TabContentProps {
  activeTab: TabId;
  project: Project;
  client?: Client;
  tasks: Task[];
  ownerName: string;
  isPrivate: boolean;
  newTag: string;
  onNewTagChange: (tag: string) => void;
  onAddTag: () => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onEditProject: () => void;
  onPrivacyChange: (isPrivate: boolean) => void;
  onUpdateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
}

function TabContent(props: TabContentProps) {
  if (props.activeTab === "overview") {
    return <ProjectOverview {...props} />;
  }

  if (props.activeTab === "tasks") {
    return (
      <div className="h-full overflow-y-auto p-lg">
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Tasks ({props.tasks.length})</h2>
          <Button onClick={props.onAddTask}>
            <Plus size={16} />
            Add Task
          </Button>
        </div>
        <TaskList tasks={props.tasks} onAddTask={() => props.onAddTask()} onEditTask={props.onEditTask} />
      </div>
    );
  }

  if (props.activeTab === "board") {
    return (
      <div className="h-full overflow-y-auto p-lg">
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Board ({props.tasks.length})</h2>
          <Button onClick={props.onAddTask}>
            <Plus size={16} />
            Add Task
          </Button>
        </div>
        <KanbanBoard tasks={props.tasks} onAddTask={props.onAddTask} onEditTask={props.onEditTask} />
      </div>
    );
  }

  return null;
}

function ProjectOverview({
  project,
  client,
  tasks,
  ownerName,
  isPrivate,
  newTag,
  onNewTagChange,
  onAddTag,
  onAddTask,
  onEditProject,
  onPrivacyChange,
  onUpdateProject,
}: TabContentProps) {
  const sessions = useApp((s) => s.sessions);
  const status = project.status ?? "active";
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const doingCount = tasks.filter((task) => task.status === "doing").length;
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const totalEstimate = tasks.reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0);
  const completion = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const projectConfirmedSessions = sessions.filter((session) => session.projectId === project.id && (session.state ?? "confirmed") === "confirmed");
  const projectDraftSessions = sessions.filter((session) => session.projectId === project.id && session.state === "draft");
  const projectLoggedSeconds = projectConfirmedSessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const workLogStatus = projectDraftSessions.length > 0
    ? "Needs review"
    : projectConfirmedSessions.length > 0
      ? "Report-ready"
      : "No work yet";
  const workLogDetail = projectDraftSessions.length > 0
    ? `${projectDraftSessions.length} draft${projectDraftSessions.length === 1 ? "" : "s"} not in reports`
    : projectConfirmedSessions.length > 0
      ? "all sessions confirmed"
      : "start a focus session";
  const nextTasks = [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid gap-lg p-lg xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-lg">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
            <div className="flex items-start justify-between gap-lg border-b border-border-subtle p-xl">
              <div className="min-w-0 space-y-md">
                <div className="flex flex-wrap items-center gap-sm">
                  <span className={cn("h-4 w-4 rounded-md", getColorClass(project.color))} />
                  <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
                  <Badge variant={project.billable ? "success" : "raised"}>
                    {project.billable ? "Billable" : "Internal"}
                  </Badge>
                  <Badge variant="raised">{isPrivate ? "Private" : "Shared"}</Badge>
                </div>
                <div>
                  <h2 className="text-[28px] font-semibold leading-tight text-text-primary">{project.name}</h2>
                  <p className="mt-sm max-w-3xl text-sm leading-relaxed text-text-secondary">
                    {project.description || "No description yet. Add context, scope, or handoff notes for this project."}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onEditProject}>
                <PencilSimple size={14} />
                Edit details
              </Button>
            </div>

            <div className="grid gap-px bg-border-subtle md:grid-cols-5">
              <Metric icon={<CheckCircle size={17} />} label="Progress" value={`${completion}%`} detail={`${doneCount} of ${tasks.length} done`} />
              <Metric icon={<Clock size={17} />} label="Active work" value={`${doingCount}`} detail={`${todoCount} waiting`} />
              <Metric icon={<Target size={17} />} label="Estimate" value={formatMinutes(totalEstimate)} detail={totalEstimate ? "planned effort" : "not estimated"} />
              <Metric icon={<FolderOpen size={17} />} label="Work log" value={workLogStatus} detail={workLogDetail} />
              <Metric icon={<CalendarBlank size={17} />} label="Timeline" value={formatDateRange(project.startDate, project.endDate)} detail={project.endDate ? "target date set" : "no end date"} />
            </div>
          </div>

          <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Workload">
              <div className="space-y-lg">
                <ProgressRow label="To do" count={todoCount} total={tasks.length} tone="bg-text-faint" />
                <ProgressRow label="Doing" count={doingCount} total={tasks.length} tone="bg-accent" />
                <ProgressRow label="Done" count={doneCount} total={tasks.length} tone="bg-success" />
              </div>
            </Panel>

            <BillingPanel
              project={project}
              client={client}
              sessions={projectConfirmedSessions}
              loggedSeconds={projectLoggedSeconds}
              onUpdateProject={onUpdateProject}
            />
          </div>

          <Panel
            title="Next tasks"
            action={
              <Button variant="secondary" size="sm" onClick={onAddTask}>
                <Plus size={14} />
                Add task
              </Button>
            }
          >
            {nextTasks.length ? (
              <div className="divide-y divide-border-subtle">
                {nextTasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-[1fr_96px_86px] items-center gap-md py-md first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{task.title}</p>
                      <p className="text-xs text-text-muted">{task.estimateMinutes ? `${task.estimateMinutes}m estimate` : "No estimate"}</p>
                    </div>
                    <Badge variant={TASK_STATUS_BADGE_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                    <span className="text-right text-xs capitalize text-text-muted">{task.urgency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-canvas p-xl text-center">
                <p className="text-sm font-medium text-text-primary">No open tasks</p>
                <p className="mt-xs text-xs text-text-muted">Create the first task for this project.</p>
              </div>
            )}
          </Panel>
        </section>

        <aside className="flex flex-col gap-lg">
          <Panel title="Project details">
            <div className="grid gap-md">
              <DetailRow icon={<User size={15} />} label="Owner" value={ownerName} />
              <DetailRow icon={<FolderOpen size={15} />} label="Project ID" value={project.id.slice(0, 8)} />
              <DetailRow icon={<CalendarBlank size={15} />} label="Created" value={formatDate(project.createdAt)} />
              <DetailRow icon={<Archive size={15} />} label="Archived" value={project.archivedAt ? formatDate(project.archivedAt) : "No"} />
            </div>
          </Panel>

          <Panel title="Visibility">
            <div className="grid grid-cols-2 gap-sm">
              <button
                onClick={() => onPrivacyChange(true)}
                className={cn(
                  "flex items-center justify-center gap-xs rounded-md border px-sm py-sm text-xs font-medium transition-colors",
                  isPrivate
                    ? "border-accent bg-accent text-white"
                    : "border-border-subtle text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                )}
              >
                <Lock size={12} />
                Private
              </button>
              <button
                onClick={() => onPrivacyChange(false)}
                className={cn(
                  "flex items-center justify-center gap-xs rounded-md border px-sm py-sm text-xs font-medium transition-colors",
                  !isPrivate
                    ? "border-accent bg-accent text-white"
                    : "border-border-subtle text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                )}
              >
                <LockOpen size={12} />
                Shared
              </button>
            </div>
          </Panel>

          <Panel title="Tags">
            <div className="flex flex-wrap gap-sm">
              {(project.tags ?? []).filter((tag) => tag !== "public").length ? (
                (project.tags ?? [])
                  .filter((tag) => tag !== "public")
                  .map((tag) => (
                    <Badge key={tag} variant="raised">
                      <Tag size={11} />
                      {tag}
                    </Badge>
                  ))
              ) : (
                <p className="text-sm text-text-muted">No tags yet.</p>
              )}
            </div>
            <div className="mt-md flex gap-sm">
              <input
                value={newTag}
                onChange={(event) => onNewTagChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onAddTag();
                }}
                placeholder="Add tag"
                className="h-9 min-w-0 flex-1 rounded-md border border-border-subtle bg-canvas px-sm text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
              <Button variant="secondary" size="sm" onClick={onAddTag}>
                Add
              </Button>
            </div>
          </Panel>

          <Panel title="Description">
            <textarea
              placeholder="Add description..."
              className="min-h-[112px] w-full resize-none rounded-md border border-border-subtle bg-canvas px-sm py-sm text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              defaultValue={project.description || ""}
              onBlur={(event) => onUpdateProject(project.id, { description: event.currentTarget.value })}
            />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/**
 * Effective rate, earnings to date, and inline rate editing. The rate lives
 * here so a project's billing can be corrected without opening the edit modal.
 */
function BillingPanel({
  project,
  client,
  sessions,
  loggedSeconds,
  onUpdateProject,
}: {
  project: Project;
  client?: Client;
  sessions: Session[];
  loggedSeconds: number;
  onUpdateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rate = resolveHourlyRate(project, client);
  const billableSeconds = sessions.reduce(
    (sum, session) => (session.billable ? sum + session.durationSeconds : sum),
    0
  );
  const earnedCents = earningsCents(billableSeconds, rate.dollarsPerHour);
  const budgetUsedPct =
    project.budget && project.budget > 0 ? (earnedCents / 100 / project.budget) * 100 : null;

  const startEditing = () => {
    setDraft(project.hourlyRate != null && project.hourlyRate > 0 ? String(project.hourlyRate) : "");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const parsed = parseRateInput(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      await onUpdateProject(project.id, { hourlyRate: parsed.value });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the rate");
    } finally {
      setSaving(false);
    }
  };

  const sourceBadge =
    rate.source === "project"
      ? { label: "Project rate", variant: "accent" as const }
      : rate.source === "client"
        ? { label: `From ${client?.name ?? "client"}`, variant: "success" as const }
        : { label: "Not set", variant: "raised" as const };

  return (
    <Panel
      title="Billing"
      action={
        !editing && (
          <Button variant="secondary" size="sm" onClick={startEditing}>
            <PencilSimple size={13} />
            {rate.source === "project" ? "Edit rate" : "Set rate"}
          </Button>
        )
      }
    >
      <div className="space-y-lg">
        <div className="rounded-md border border-border-subtle bg-canvas p-md">
          {editing ? (
            <div className="space-y-sm">
              <p className="text-xs text-text-muted">Project hourly rate</p>
              <div className="flex items-center gap-sm">
                <span className="flex h-9 min-w-0 flex-1 items-center gap-1 rounded-md border border-border-subtle bg-surface-raised px-sm focus-within:border-accent">
                  <span className="text-sm text-text-muted">$</span>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    aria-label="Project hourly rate in dollars"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") save();
                      if (event.key === "Escape") setEditing(false);
                    }}
                    placeholder={
                      client?.hourlyRate ? String(client.hourlyRate) : "0.00"
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                  />
                  <span className="text-xs text-text-muted">/hr</span>
                </span>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
              <p className={cn("text-xs", error ? "text-error" : "text-text-muted")}>
                {error ??
                  (client?.hourlyRate
                    ? `Leave empty to inherit ${formatHourlyRate(client.hourlyRate)} from ${client.name}.`
                    : "Leave empty to remove the rate.")}
              </p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-md">
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Effective rate</p>
                <p className="mt-xs text-2xl font-semibold leading-none text-text-primary">
                  {rate.dollarsPerHour > 0 ? formatHourlyRate(rate.dollarsPerHour) : "Not set"}
                </p>
              </div>
              <Badge variant={sourceBadge.variant}>{sourceBadge.label}</Badge>
            </div>
          )}
        </div>

        <div className="grid gap-md">
          <DetailRow icon={<Briefcase size={15} />} label="Client" value={client?.name ?? "No client assigned"} />
          <DetailRow
            icon={<Clock size={15} />}
            label="Billable time"
            value={`${formatDuration(billableSeconds)} of ${formatDuration(loggedSeconds)} logged`}
          />
          <DetailRow
            icon={<CurrencyDollar size={15} />}
            label="Earned so far"
            value={
              rate.dollarsPerHour > 0
                ? formatCurrency(earnedCents / 100)
                : "Add a rate to see earnings"
            }
          />
          <DetailRow
            icon={<Target size={15} />}
            label="Budget"
            value={
              project.budget
                ? `${formatCurrency(project.budget)}${budgetUsedPct != null ? ` · ${budgetUsedPct.toFixed(0)}% used` : ""}`
                : "Not set"
            }
          />
        </div>

        {budgetUsedPct != null && (
          <div className="h-2 overflow-hidden rounded-full bg-surface-mid">
            <div
              className={cn("h-full rounded-full", budgetUsedPct > 100 ? "bg-error" : "bg-success")}
              style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
            />
          </div>
        )}

        {!project.billable && (
          <p className="text-xs text-text-muted">
            This project is marked internal, so new sessions default to non-billable.
          </p>
        )}
      </div>
    </Panel>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-raised p-lg">
      <div className="mb-lg flex items-center justify-between gap-md">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-surface-raised p-lg">
      <div className="mb-md flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">{icon}</div>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-xs text-xl font-semibold text-text-primary">{value}</p>
      <p className="mt-xs text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function ProgressRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: string;
}) {
  const width = total ? Math.max(4, Math.round((count / total) * 100)) : 0;
  return (
    <div className="space-y-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-muted">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-mid">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-sm">
      <span className="mt-0.5 text-text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-text-primary" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "Not set";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate?: number, endDate?: number) {
  if (!startDate && !endDate) return "Not set";
  if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  return startDate ? `Starts ${formatDate(startDate)}` : `Due ${formatDate(endDate)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMinutes(minutes: number) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h${mins ? ` ${mins}m` : ""}` : `${mins}m`;
}

function getColorClass(color: string): string {
  return PROJECT_COLOR_CLASSES[color as ProjectColor] || "bg-slate-400";
}
