"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store-supabase";
import { projectBudgetHealth } from "@/lib/budget";
import { formatCurrency, formatDuration } from "@/lib/format";
import { PencilSimple, Archive, Trash, CalendarBlank, CurrencyDollar } from "@/components/ui/icon";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Project, ProjectStatus, ProjectColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PROJECT_COLOR_CLASSES } from "@/lib/constants";

const STATUS_BADGE_VARIANT: Record<ProjectStatus, "success" | "warning" | "accent" | "raised"> = {
  active: "success",
  paused: "warning",
  completed: "accent",
  archived: "raised",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectDetailsCard({
  project,
  onEdit,
}: {
  project: Project;
  onEdit: () => void;
}) {
  const clients = useApp((s) => s.clients);
  const archiveProject = useApp((s) => s.archiveProject);
  const restoreProject = useApp((s) => s.restoreProject);
  const deleteProject = useApp((s) => s.deleteProject);

  const sessions = useApp((s) => s.sessions);

  const client = useMemo(
    () => clients.find((c) => c.id === project.clientId),
    [clients, project.clientId]
  );

  const status: ProjectStatus = project.status || "active";
  const isArchived = project.archived || status === "archived";

  const handleArchive = async () => {
    if (isArchived) {
      await restoreProject(project.id);
    } else {
      await archiveProject(project.id);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(project.id);
    }
  };

  // Lifetime, not report-period — see budget.ts.
  const budget = useMemo(
    () => projectBudgetHealth(project, sessions, client),
    [project, sessions, client]
  );

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-lg p-4xl space-y-3xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
      {/* Header with title and actions */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-lg">
          <div className="flex items-center gap-md">
            <div
              className={`w-4 h-4 rounded-full ${getColorClass(project.color)}`}
            />
            <h2 className="text-2xl font-semibold text-text-primary">
              {project.name}
            </h2>
            <Badge
              className="ml-2xl"
              variant={STATUS_BADGE_VARIANT[status]}
            >
              {STATUS_LABELS[status]}
            </Badge>
          </div>

          {project.description && (
            <p className="text-text-secondary">{project.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-sm">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-surface-raised transition-colors text-text-secondary hover:text-text-primary"
            title="Edit project"
          >
            <PencilSimple size={18} aria-hidden />
          </button>
          <button
            onClick={handleArchive}
            className="p-2 rounded-lg hover:bg-surface-raised transition-colors text-text-secondary hover:text-text-primary"
            title={isArchived ? "Restore project" : "Archive project"}
          >
            <Archive size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-surface-raised transition-colors text-text-secondary hover:text-rose-400"
            title="Delete project"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3xl md:grid-cols-4">
        {/* Client */}
        <div className="space-y-sm">
          <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">
            Client
          </p>
          {client ? (
            <div>
              <p className="text-text-primary font-medium">{client.name}</p>
              {client.email && (
                <p className="text-xs text-text-muted">{client.email}</p>
              )}
            </div>
          ) : (
            <p className="text-text-faint">No client assigned</p>
          )}
        </div>

        {/* Start Date */}
        <div className="space-y-sm">
          <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">
            Start Date
          </p>
          <div className="flex items-center gap-sm">
            <CalendarBlank size={14} className="text-text-muted" />
            <p className="text-text-primary font-medium">
              {formatDate(project.startDate)}
            </p>
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-sm">
          <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">
            End Date
          </p>
          <div className="flex items-center gap-sm">
            <CalendarBlank size={14} className="text-text-muted" />
            <p className="text-text-primary font-medium">
              {formatDate(project.endDate)}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-sm">
          <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">
            Budget
          </p>
          <div className="flex items-center gap-sm">
            <CurrencyDollar size={14} className="text-text-muted" />
            <p className="text-text-primary font-medium">
              {project.budget ? `$${project.budget}` : "Not set"}
            </p>
          </div>
          {budget.status !== "none" && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[12px] tabular-nums font-medium",
                    budget.status === "over"
                      ? "text-error"
                      : budget.status === "warning"
                        ? "text-warning"
                        : "text-text-secondary"
                  )}
                >
                  {formatCurrency(budget.spentCents)} spent · {budget.usedPct.toFixed(0)}%
                </span>
                <span className="text-[12px] text-text-faint tabular-nums">
                  {budget.remainingCents >= 0
                    ? `${formatCurrency(budget.remainingCents)} left`
                    : `${formatCurrency(-budget.remainingCents)} over`}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface-mid)" }}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    budget.status === "over"
                      ? "bg-error"
                      : budget.status === "warning"
                        ? "bg-warning"
                        : "bg-success"
                  )}
                  style={{ width: `${Math.min(100, budget.usedPct)}%` }}
                />
              </div>
              {/* Hours is what people act on; only shown when a rate makes the
                  conversion real. */}
              {budget.remainingSeconds !== null && (
                <p className="text-[12px] text-text-muted">
                  {budget.remainingSeconds > 0
                    ? `About ${formatDuration(budget.remainingSeconds)} of billable work left`
                    : "No billable hours left in this budget"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Billable status and tags */}
      <div className="flex flex-col gap-lg md:flex-row md:items-center md:justify-between pt-lg border-t border-border-subtle">
        <div className="space-y-sm">
          <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">
            Billable
          </p>
          <Badge
            variant={project.billable ? "success" : "raised"}
          >
            {project.billable ? "Yes" : "No"}
          </Badge>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-sm items-start md:items-center">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="raised">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getColorClass(color: string): string {
  return PROJECT_COLOR_CLASSES[color as ProjectColor] || "bg-slate-400";
}
