"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/lib/store-supabase";
import { Button } from "@/components/ui/button";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const projects = useApp((s) => s.projects);
  const tasks = useApp((s) => s.tasks);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId && !t.archived),
    [tasks, projectId]
  );

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Project not found
          </h1>
          <p className="text-text-secondary mb-6">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProjectWorkspace
      project={project}
      tasks={projectTasks}
      onBack={() => router.back()}
    />
  );
}
