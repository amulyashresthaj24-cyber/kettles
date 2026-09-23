import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { getProjectColor } from "@/lib/constants";
import { ProjectMark } from "./ProjectMark";

export function ProjectTag({ project, className }: { project: Project; className?: string }) {
  const colorMeta = getProjectColor(project.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold truncate max-w-[160px]",
        className,
      )}
      style={{ background: colorMeta.hex + "18", color: colorMeta.hex }}
    >
      <ProjectMark project={project} size={12} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
