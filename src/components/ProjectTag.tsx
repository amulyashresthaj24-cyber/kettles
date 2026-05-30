import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { getProjectColor, resolveProjectIcon } from "@/lib/constants";
import { AppIcon, type IconName } from "@/components/ui/icon";

export function ProjectTag({ project, className }: { project: Project; className?: string }) {
  const colorMeta = getProjectColor(project.color);
  const iconKey = resolveProjectIcon(project.icon) as IconName;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold truncate max-w-[160px]",
        className,
      )}
      style={{ background: colorMeta.hex + "18", color: colorMeta.hex }}
    >
      <AppIcon name={iconKey} size={11} weight="bold" style={{ color: colorMeta.hex } as React.CSSProperties} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
