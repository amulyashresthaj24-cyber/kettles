"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store-supabase";
import { Edit, Archive, Trash2, Calendar, DollarSign } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-emerald-500 text-white",
  paused: "bg-amber-500 text-white",
  completed: "bg-blue-500 text-white",
  archived: "bg-gray-600 text-white",
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

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4xl space-y-3xl">
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
              className={cn("ml-2xl", STATUS_COLORS[status])}
              variant="default"
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
            <Edit size={18} />
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
            <Trash2 size={18} />
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
            <Calendar size={14} className="text-text-muted" />
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
            <Calendar size={14} className="text-text-muted" />
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
            <DollarSign size={14} className="text-text-muted" />
            <p className="text-text-primary font-medium">
              {project.budget ? `$${project.budget}` : "Not set"}
            </p>
          </div>
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
  const colors: Record<string, string> = {
    teal: "bg-teal-400",
    amber: "bg-accent",
    rose: "bg-rose-400",
    indigo: "bg-indigo-400",
  };
  return colors[color] || "bg-slate-400";
}
