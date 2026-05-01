import { cn } from "@/lib/utils";
import type { Project, ProjectColor } from "@/lib/types";

const DOT: Record<ProjectColor, string> = {
  teal: "bg-teal-400",
  amber: "bg-accent",
  rose: "bg-rose-400",
  indigo: "bg-indigo-400",
};

export function ProjectTag({ project, className }: { project: Project; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded-full bg-surface-raised px-sm py-xs text-[12px] font-medium text-text-secondary",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[project.color])} />
      {project.name}
    </span>
  );
}
