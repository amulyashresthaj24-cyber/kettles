"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getProjectColor, resolveProjectIcon } from "@/lib/constants";
import { AppIcon, type IconName } from "@/components/ui/icon";
import { isDisplayableLogoUrl } from "@/lib/project-logo";
import { getProjectLogoUrl, subscribeProjectLogoCache } from "@/lib/project-logo-client";

export interface ProjectMarkSource {
  name?: string;
  color?: string;
  icon?: string;
  logoPath?: string | null;
  logoUrl?: string | null;
}

function markHex(color: string | undefined): string {
  if (color && color.startsWith("#")) return color;
  return getProjectColor(color || "").hex;
}

export function useProjectLogoUrl(logoPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => subscribeProjectLogoCache(() => setGeneration((n) => n + 1)), []);

  useEffect(() => {
    if (!logoPath) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    getProjectLogoUrl(logoPath).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [logoPath, generation]);

  return url;
}

export function ProjectMark({
  project,
  size = 20,
  className,
}: {
  project: ProjectMarkSource;
  size?: number;
  className?: string;
}) {
  const direct = project.logoUrl && isDisplayableLogoUrl(project.logoUrl) ? project.logoUrl : null;
  const signed = useProjectLogoUrl(direct ? null : project.logoPath);
  const src = direct ?? signed;
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const showLogo = Boolean(src) && brokenSrc !== src;
  const hex = markHex(project.color);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md", className)}
      style={{
        width: size,
        height: size,
        background: showLogo ? "var(--surface-mid)" : hex + "20",
      }}
      aria-hidden
    >
      {showLogo ? (
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setBrokenSrc(src!)}
        />
      ) : (
        <AppIcon
          name={resolveProjectIcon(project.icon) as IconName}
          size={Math.max(10, Math.round(size * 0.62))}
          weight="regular"
          style={{ color: hex }}
        />
      )}
    </span>
  );
}

/** Project row used inside dropdown triggers and menus. */
export function ProjectOptionLabel({
  project,
  suffix,
  size = 14,
}: {
  project: ProjectMarkSource;
  suffix?: string;
  size?: number;
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <ProjectMark project={project} size={size} />
      <span className="truncate">
        {project.name}
        {suffix}
      </span>
    </span>
  );
}
