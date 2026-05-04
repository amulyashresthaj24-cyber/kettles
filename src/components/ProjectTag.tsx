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
        "inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text-secondary truncate max-w-[160px]",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT[project.color])} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
