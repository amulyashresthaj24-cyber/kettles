import { elapsedSeconds, formatDuration } from "./api.js";

function parseClock(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function isInsideWorkday(settings, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseClock(settings.workdayStart);
  const end = parseClock(settings.workdayEnd);
  if (start === end) return true;
  if (start < end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export function collectTags(task, project) {
  const tags = [...(task?.tags || []), ...(project?.tags || [])];
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
}

export function hasTagMismatch(settings, activeTask, activeProject) {
  const workingTags = (settings.workingTags || []).map((tag) => tag.toLowerCase());
  if (workingTags.length === 0) return false;
  const currentTags = collectTags(activeTask, activeProject).map((tag) => tag.toLowerCase());
  return currentTags.length > 0 && !currentTags.some((tag) => workingTags.includes(tag));
}

export function buildReminder(settings, snapshot, now = new Date()) {
  if (!settings.notificationsEnabled || !isInsideWorkday(settings, now)) return null;

  const { activeSession, activeTask, activeProject } = snapshot;
  const todayKey = now.toISOString().slice(0, 10);

  if (!activeSession) {
    if (!settings.noActiveSessionEnabled || settings.lastNoActiveSessionDate === todayKey) return null;
    return {
      kind: "no-active-session",
      title: "No Kettles timer running",
      message: "Open Kettles when you are ready to track the next block.",
      patch: { lastNoActiveSessionDate: todayKey }
    };
  }

  if (settings.tagMismatchEnabled && hasTagMismatch(settings, activeTask, activeProject)) {
    if (settings.lastTagMismatchSessionId !== activeSession.id) {
      return {
        kind: "tag-mismatch",
        title: "Working tag looks different",
        message: `${activeTask?.title || "Current task"} is not in your selected working tags.`,
        patch: { lastTagMismatchSessionId: activeSession.id }
      };
    }
  }

  if (settings.longRunningSessionEnabled) {
    const interval = Math.max(5, Number(settings.reminderIntervalMinutes || 25));
    const elapsed = elapsedSeconds(activeSession);
    const bucket = Math.floor(elapsed / (interval * 60));
    const bucketKey = `${activeSession.id}:${bucket}`;
    if (bucket > 0 && settings.lastLongRunningBucket !== bucketKey) {
      return {
        kind: "long-running-session",
        title: "Kettles focus check",
        message: `${activeTask?.title || "This session"} has been running for ${formatDuration(elapsed)}.`,
        patch: {
          lastLongRunningBucket: bucketKey,
          lastNotifiedActiveSessionId: activeSession.id
        }
      };
    }
  }

  return null;
}
