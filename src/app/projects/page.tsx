"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  PencilSimple,
  Trash,
  CurrencyDollar,
  Archive,
  ArrowClockwise,
  MagnifyingGlass,
  FolderOpen,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddProjectModal } from "@/components/AddProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageLayout, PageHeader, PageToolbar, PageContent } from "@/components/layout";
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
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const clients = useApp((s) => s.clients);
  const deleteProject = useApp((s) => s.deleteProject);
  const archiveProject = useApp((s) => s.archiveProject);
  const restoreProject = useApp((s) => s.restoreProject);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch = project.name?.toLowerCase().includes(normalizedQuery);
      const isArchived = project.archived || project.status === "archived";

      if (showArchived) {
        return matchesSearch && isArchived;
      }

      return matchesSearch && !isArchived;
    });
  }, [projects, searchQuery, showArchived]);

  const activeProjectCount = useMemo(
    () => projects.filter((project) => !(project.archived || project.status === "archived")).length,
    [projects]
  );

  const archivedProjectCount = useMemo(
    () => projects.filter((project) => project.archived || project.status === "archived").length,
    [projects]
  );

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setOpenEdit(true);
  };

  const handleDelete = (project: Project) => {
    setDeleteTarget(project);
  };

  const handleEditClose = () => {
    setOpenEdit(false);
    setEditingProject(undefined);
  };

  return (
    <PageLayout>
      <PageHeader
        title="Projects"
        subtitle={
          showArchived
            ? `${archivedProjectCount} archived ${archivedProjectCount === 1 ? "project" : "projects"}`
            : `${activeProjectCount} active ${activeProjectCount === 1 ? "project" : "projects"}`
        }
        action={
          !showArchived && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpenAdd(true)}
              className="gap-1.5"
            >
              <Plus size={14} />
              New Project
            </Button>
          )
        }
      />

      <PageContent>
        <section className="flex flex-col gap-md rounded-lg p-lg" style={{ background: "#0f1011", border: "1px solid #1e1f20" }}>
        <div className="flex flex-col gap-md lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <Input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 border-border-subtle bg-surface-mid pl-9 text-[14px]"
            />
          </div>

          <Button
            type="button"
            variant={showArchived ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowArchived((value) => !value)}
            className="gap-1.5 self-start lg:self-auto"
            title={`${archivedProjectCount} archived project(s)`}
          >
            <Archive size={14} />
            Archived
            {archivedProjectCount > 0 && (
              <span className="ml-0.5 rounded-full bg-surface px-1.5 py-0.5 text-[11px] leading-none text-text-secondary">
                {archivedProjectCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-border-subtle pt-md">
          <p className="text-[13px] font-medium text-text-muted">
            Showing {filteredProjects.length}{" "}
            {filteredProjects.length === 1 ? "project" : "projects"}
          </p>

          {searchQuery && (
            <Button
              type="button"
              variant="subtle"
              size="xs"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-lg" style={{ background: "#0f1011", border: "1px solid #1e1f20" }}>
        {filteredProjects.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-md px-6 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted" style={{ background: "#1e1f20" }}>
              <FolderOpen size={18} />
            </div>
            <div className="flex flex-col gap-xs">
              <h2 className="text-[16px] font-semibold text-text-primary">
                {searchQuery
                  ? "No projects match your search"
                  : showArchived
                    ? "No archived projects"
                    : "No projects yet"}
              </h2>
              <p className="max-w-[360px] text-[14px] leading-5 text-text-muted">
                {searchQuery
                  ? "Try a different project name or clear the search."
                  : showArchived
                    ? "Archived projects will appear here when you move active work out of the main list."
                    : "Create a project to organize tasks, sessions, and billable work."}
              </p>
            </div>
            {!showArchived && !searchQuery && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setOpenAdd(true)}
                className="gap-1.5"
              >
                <Plus size={14} />
                New Project
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredProjects.map((project) => {
              const client = project.clientId
                ? clients.find((candidate) => candidate.id === project.clientId)
                : undefined;
              const isArchived = project.archived || project.status === "archived";

              return (
                <article
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className={cn(
                    "group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-lg px-lg py-md transition-colors duration-150 ease-out hover:bg-surface-mid focus-within:bg-surface-mid",
                    isArchived && "opacity-75"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-md transition-all duration-200 ease-out group-hover:gap-[18px]">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface-raised/70 transition-all duration-200 ease-out group-hover:ring-4",
                        colorDot(project.color),
                        isArchived && "opacity-50"
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-sm transition-all duration-200 ease-out group-hover:gap-md">
                        <h3
                          className={cn(
                            "truncate text-[15px] font-semibold leading-5 tracking-[0.005em]",
                            isArchived
                              ? "text-text-muted line-through"
                              : "text-text-primary"
                          )}
                        >
                          {project.name}
                        </h3>
                        {isArchived && (
                          <Badge variant="raised" className="rounded-sm text-[11px]">
                            Archived
                          </Badge>
                        )}

                        {/* Client and Billable - Appear on Hover */}
                        {client && (
                          <Badge 
                            variant="raised" 
                            className="rounded-sm text-[11px] max-w-full transition-all duration-200 ease-out origin-left transform group-hover:opacity-100 group-hover:scale-100 opacity-0 scale-95 pointer-events-none"
                          >
                            <span className="truncate">{client.name}</span>
                          </Badge>
                        )}
                        {project.billable && (
                          <Badge 
                            variant="accent" 
                            className="rounded-sm text-[11px] transition-all duration-200 ease-out origin-left transform group-hover:opacity-100 group-hover:scale-100 opacity-0 scale-95 pointer-events-none"
                          >
                            <CurrencyDollar size={11} />
                            Billable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-xs opacity-80 transition-opacity group-hover:opacity-100">
                    {!showArchived ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(project);
                          }}
                          aria-label="Edit project"
                          title="Edit"
                        >
                          <PencilSimple size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            archiveProject(project.id);
                          }}
                          aria-label="Archive project"
                          title="Archive"
                        >
                          <Archive size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(project);
                          }}
                          className="hover:text-status-error"
                          aria-label="Delete project"
                          title="Delete"
                        >
                          <Trash size={15} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            restoreProject(project.id);
                          }}
                          className="hover:text-status-success"
                          aria-label="Restore project"
                          title="Restore"
                        >
                          <ArrowClockwise size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(project);
                          }}
                          className="hover:text-status-error"
                          aria-label="Delete project permanently"
                          title="Delete permanently"
                        >
                          <Trash size={15} />
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AddProjectModal open={openAdd} onClose={() => setOpenAdd(false)} />

      <EditProjectModal
        open={openEdit}
        project={editingProject}
        onClose={handleEditClose}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete project?"
        description={`This will permanently delete "${deleteTarget?.name ?? "this project"}". Existing tasks and sessions linked to it may also be affected by the backend relationship.`}
        pending={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            await deleteProject(deleteTarget.id);
            setDeleteTarget(null);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
      </PageContent>
    </PageLayout>
  );
}
