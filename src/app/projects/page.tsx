"use client";

import { useMemo, useState } from "react";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddProjectModal } from "@/components/AddProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import type { Project } from "@/lib/types";

const colorDot = (color: string) => {
  const colors: Record<string, string> = {
    teal: "bg-teal-400",
    amber: "bg-accent",
    rose: "bg-rose-400",
    indigo: "bg-indigo-400",
  };
  return colors[color] || "bg-slate-400";
};

export default function ProjectsPage() {
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const deleteProject = useApp((s) => s.deleteProject);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setOpenEdit(true);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
  };

  const handleEditClose = () => {
    setOpenEdit(false);
    setEditingProject(undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-lg">
        <div className="flex flex-col gap-1">
          <h1 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.015em] text-text-primary">
            My Projects
          </h1>
          <p className="text-[14px] text-text-muted">Free</p>
        </div>
      </header>

      {/* Search + Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[var(--surface-mid)] border border-[var(--border-subtle)] rounded-lg text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-[13px] text-[var(--text-muted)]">
                Archived projects only
              </span>
            </label>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenAdd(true)}
            className="gap-1.5 shrink-0 rounded-full"
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>

      {/* Projects count */}
      <div className="text-[13px] text-[var(--text-muted)] font-medium">
        {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-subtle)]" />

      {/* Projects list */}
      <div className="flex flex-col gap-2">
        {filteredProjects.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            No projects found. Create one to get started!
          </div>
        ) : (
          filteredProjects.map((project) => {
            const client = project.clientId
              ? clients.find((c) => c.id === project.clientId)
              : undefined;

            return (
              <div
                key={project.id}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Color dot */}
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shrink-0",
                      colorDot(project.color)
                    )}
                  />

                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {client && (
                        <span className="text-[12px] text-[var(--text-muted)] bg-[var(--surface-mid)] px-2 py-1 rounded">
                          {client.name}
                        </span>
                      )}
                      {project.billable && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-secondary)] bg-[var(--accent-dim)] px-2 py-1 rounded">
                          <DollarSign size={11} />
                          Billable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-mid)] transition-colors"
                    aria-label="Edit project"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-mid)] transition-colors"
                    aria-label="Delete project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddProjectModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
      />

      <EditProjectModal
        open={openEdit}
        project={editingProject}
        onClose={handleEditClose}
      />
    </div>
  );
}
