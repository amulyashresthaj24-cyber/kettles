/**
 * Pure helpers for personal app-usage reporting.
 * Spans come from the desktop shell (local JSON); this module never talks to
 * the session ledger or Supabase.
 */

import { colorForKey } from "./report/data";

export interface AppUsageSpan {
  exe: string;
  startedAt: number;
  endedAt: number;
  sessionId: string;
}

export interface AppUsageSlice {
  id: string;
  exe: string;
  name: string;
  seconds: number;
  color: string;
}

const APP_DISPLAY_NAMES: Record<string, string> = {
  "code.exe": "VS Code",
  "code - insiders.exe": "VS Code Insiders",
  "cursor.exe": "Cursor",
  "windsurf.exe": "Windsurf",
  "devenv.exe": "Visual Studio",
  "chrome.exe": "Chrome",
  "msedge.exe": "Edge",
  "firefox.exe": "Firefox",
  "brave.exe": "Brave",
  "slack.exe": "Slack",
  "discord.exe": "Discord",
  "spotify.exe": "Spotify",
  "figma.exe": "Figma",
  "notion.exe": "Notion",
  "explorer.exe": "File Explorer",
  "windowsterminal.exe": "Terminal",
  "powershell.exe": "PowerShell",
  "pwsh.exe": "PowerShell",
  "cmd.exe": "Command Prompt",
  "notepad.exe": "Notepad",
  "winword.exe": "Word",
  "excel.exe": "Excel",
  "powerpnt.exe": "PowerPoint",
  "outlook.exe": "Outlook",
  "olk.exe": "Outlook",
  "teams.exe": "Teams",
  "ms-teams.exe": "Teams",
  "zoom.exe": "Zoom",
  "obs64.exe": "OBS",
  "obs32.exe": "OBS",
  "telegram.exe": "Telegram",
  "whatsapp.exe": "WhatsApp",
  "flowmate.exe": "Kettles",
  "kettles.exe": "Kettles",
};

export function displayNameForExe(exe: string): string {
  const trimmed = exe.trim();
  if (!trimmed) return "Unknown";
  const key = trimmed.toLowerCase();
  if (APP_DISPLAY_NAMES[key]) return APP_DISPLAY_NAMES[key];
  return trimmed.replace(/\.exe$/i, "");
}

export function filterSpansBySessionIds(
  spans: AppUsageSpan[],
  sessionIds: Set<string>
): AppUsageSpan[] {
  if (sessionIds.size === 0) return [];
  return spans.filter((s) => sessionIds.has(s.sessionId));
}

export function aggregateAppUsage(spans: AppUsageSpan[]): AppUsageSlice[] {
  const secondsByKey = new Map<string, number>();
  const exeByKey = new Map<string, string>();
  for (const span of spans) {
    const seconds = Math.max(0, Math.round((span.endedAt - span.startedAt) / 1000));
    if (seconds <= 0) continue;
    const key = span.exe.trim().toLowerCase();
    if (!key) continue;
    secondsByKey.set(key, (secondsByKey.get(key) ?? 0) + seconds);
    if (!exeByKey.has(key)) exeByKey.set(key, span.exe.trim());
  }
  return Array.from(secondsByKey.entries())
    .map(([id, seconds]) => {
      const exe = exeByKey.get(id) ?? id;
      return {
        id,
        exe,
        name: displayNameForExe(exe),
        seconds,
        color: colorForKey(id),
      };
    })
    .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name));
}
