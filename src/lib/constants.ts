export interface ProjectColorOption {
  id: string;
  hex: string;
  hexDark: string;
  bg: string;
  text: string;
  fill: string;
}

export const PROJECT_COLORS: ProjectColorOption[] = [
  { id: "slate",  hex: "#64748b", hexDark: "#94a3b8", bg: "bg-slate-500",  text: "text-slate-700 dark:text-slate-300",  fill: "bg-slate-500/[0.12]" },
  { id: "red",    hex: "#ef4444", hexDark: "#f87171", bg: "bg-red-500",    text: "text-red-700 dark:text-red-300",      fill: "bg-red-500/[0.12]" },
  { id: "orange", hex: "#f97316", hexDark: "#fb923c", bg: "bg-orange-500", text: "text-orange-700 dark:text-orange-300",fill: "bg-orange-500/[0.12]" },
  { id: "amber",  hex: "#f59e0b", hexDark: "#fbbf24", bg: "bg-amber-500",  text: "text-amber-700 dark:text-amber-300",  fill: "bg-amber-500/[0.12]" },
  { id: "lime",   hex: "#84cc16", hexDark: "#a3e635", bg: "bg-lime-500",   text: "text-lime-700 dark:text-lime-300",    fill: "bg-lime-500/[0.12]" },
  { id: "green",  hex: "#22c55e", hexDark: "#4ade80", bg: "bg-green-500",  text: "text-green-700 dark:text-green-300",  fill: "bg-green-500/[0.12]" },
  { id: "teal",   hex: "#14b8a6", hexDark: "#2dd4bf", bg: "bg-teal-500",   text: "text-teal-700 dark:text-teal-300",    fill: "bg-teal-500/[0.12]" },
  { id: "cyan",   hex: "#06b6d4", hexDark: "#22d3ee", bg: "bg-cyan-500",   text: "text-cyan-700 dark:text-cyan-300",    fill: "bg-cyan-500/[0.12]" },
  { id: "blue",   hex: "#0066ff", hexDark: "#3385ff", bg: "bg-blue-500",   text: "text-blue-700 dark:text-blue-300",    fill: "bg-blue-500/[0.12]" },
  { id: "indigo", hex: "#6366f1", hexDark: "#818cf8", bg: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300",fill: "bg-indigo-500/[0.12]" },
  { id: "violet", hex: "#8b5cf6", hexDark: "#a78bfa", bg: "bg-violet-500", text: "text-violet-700 dark:text-violet-300",fill: "bg-violet-500/[0.12]" },
  { id: "pink",   hex: "#ec4899", hexDark: "#f472b6", bg: "bg-pink-500",   text: "text-pink-700 dark:text-pink-300",    fill: "bg-pink-500/[0.12]" },
];

export const DEFAULT_PROJECT_COLOR = "blue";
export const DEFAULT_PROJECT_ICON = "folder";

export const PROJECT_ICONS = [
  "folder", "briefcase", "target", "lightning", "tag", "clock",
  "dashboard", "tasks", "calendar", "report", "timer", "trending",
  "dollar", "user", "settings", "eye", "lock", "link",
  "checks", "palette", "at", "search", "play", "history",
  "grid", "list", "warning", "info", "checkCircle", "projects",
] as const;

export function getProjectColor(colorId: string): ProjectColorOption {
  return (
    PROJECT_COLORS.find((c) => c.id === colorId) ||
    // legacy map: old "amber" was blue
    PROJECT_COLORS.find((c) => c.id === "blue")!
  );
}

export function resolveProjectIcon(icon: string | undefined): string {
  // Guard against emoji strings stored before the icon-system migration
  if (!icon || !PROJECT_ICONS.includes(icon as never)) return DEFAULT_PROJECT_ICON;
  return icon;
}

// Legacy compat for code still using old constants
export const PROJECT_COLOR_HEX: Record<string, string> = Object.fromEntries(
  PROJECT_COLORS.map((c) => [c.id, c.hex])
);
export const PROJECT_COLOR_CLASSES: Record<string, string> = Object.fromEntries(
  PROJECT_COLORS.map((c) => [c.id, c.bg])
);
export const PROJECT_COLOR_OPTIONS = PROJECT_COLORS.map((c) => ({
  label: c.id.charAt(0).toUpperCase() + c.id.slice(1),
  value: c.id,
  bg: c.bg,
}));

export type AlarmSound = "bell" | "chime" | "digital" | "gentle" | "pulse" | "kettle";
export const ALARM_SOUNDS: { id: AlarmSound; label: string }[] = [
  { id: "bell", label: "Bell" },
  { id: "chime", label: "Chime" },
  { id: "digital", label: "Digital" },
  { id: "gentle", label: "Gentle" },
  { id: "pulse", label: "Pulse" },
  { id: "kettle", label: "Kettle" },
];
