"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellRinging,
  Clock,
  PencilSimple,
  Plus,
  Trash,
} from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { PageLayout, PageHeader, PageContent } from "@/components/layout";
import { useNotification } from "@/components/ui/notification";
import { AuthGuard } from "@/components/AuthGuard";
import { isDesktop } from "@/lib/desktop";

type Reminder = { id: string; text: string; time: string; active: boolean; days?: number[] };

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Every day", "Weekdays", or "Mon, Wed, Fri". */
function describeDays(days?: number[]) {
  if (!days || days.length === 0 || days.length === 7) return "Every day";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return "Weekdays";
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return "Weekends";
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Day-of-week picker chips. Empty selection = every day. */
function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {DAY_LABELS.map((label, day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((d) => d !== day) : [...value, day])
            }
            className={cn(
              "h-7 w-7 rounded-full text-[11px] font-semibold transition-all shrink-0",
              selected
                ? "bg-accent text-white"
                : "bg-surface-mid text-text-muted hover:text-text-primary hover:bg-surface-raised"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RemindersContent() {
  const { notify } = useNotification();
  const preferences = useApp((s) => s.preferences);
  const setPreferences = useApp((s) => s.setPreferences);

  const remindersEnabled = !!preferences?.petCustomRemindersEnabled;
  const reminders = useMemo(
    () => preferences?.petCustomReminders || [],
    [preferences?.petCustomReminders]
  );
  const breakRemindersEnabled = !!preferences?.petBreakRemindersEnabled;
  const breakIntervalMinutes = preferences?.petBreakIntervalMinutes ?? 45;

  // Composer state
  const [text, setText] = useState("");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>([]);
  const [formError, setFormError] = useState("");

  // Edit modal state
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [editDays, setEditDays] = useState<number[]>([]);

  const sortedReminders = useMemo(
    () => [...reminders].sort((a, b) => a.time.localeCompare(b.time)),
    [reminders]
  );

  const requestWebPermission = () => {
    if (isDesktop()) return; // native notifications need no browser grant
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const saveReminders = (updated: Reminder[]) =>
    setPreferences({ petCustomReminders: updated });

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setFormError("Reminder text is required.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setFormError("Pick a valid time.");
      return;
    }
    if (reminders.some((r) => r.time === time && r.text === trimmed)) {
      setFormError("That reminder already exists at this time.");
      return;
    }
    setFormError("");
    saveReminders([
      ...reminders,
      { id: String(Date.now()), text: trimmed, time, active: true, days: days.length ? days : undefined },
    ]);
    // A first reminder implies the user wants delivery on.
    if (!remindersEnabled) setPreferences({ petCustomRemindersEnabled: true });
    requestWebPermission();
    setText("");
    setDays([]);
    notify({
      title: "Reminder added",
      description: `${describeDays(days.length ? days : undefined)} at ${formatTime12h(time)}`,
      tone: "success",
    });
  };

  const openEdit = (rem: Reminder) => {
    setEditing(rem);
    setEditText(rem.text);
    setEditTime(rem.time);
    setEditDays(rem.days || []);
  };

  const handleSaveEdit = () => {
    if (!editing || !editText.trim() || !/^\d{2}:\d{2}$/.test(editTime)) return;
    saveReminders(
      reminders.map((r) =>
        r.id === editing.id
          ? { ...r, text: editText.trim(), time: editTime, days: editDays.length ? editDays : undefined }
          : r
      )
    );
    setEditing(null);
    notify({ title: "Reminder updated", description: "Your changes were saved.", tone: "success" });
  };

  return (
    <PageLayout>
      <PageHeader
        title="Reminders"
        subtitle="Schedule nudges throughout your day — delivered by your desktop mascot or as notifications."
      />

      <PageContent>
        <div className="flex flex-col gap-lg mt-md">
          {/* Master switch */}
          <section
            className="rounded-xl p-md border flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between"
            style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                <BellRinging size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-text-primary">Reminder delivery</p>
                <p className="text-[12px] text-text-muted">
                  {isDesktop()
                    ? "Reminders appear as your mascot's speech bubble plus a native Windows notification."
                    : "Reminders arrive as browser notifications. In the desktop app, your mascot delivers them too."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-sm shrink-0 self-end sm:self-auto">
              <Badge variant={remindersEnabled ? "success" : "raised"}>
                {remindersEnabled ? "On" : "Paused"}
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = !remindersEnabled;
                  setPreferences({ petCustomRemindersEnabled: next });
                  if (next) requestWebPermission();
                }}
              >
                {remindersEnabled ? "Pause all" : "Resume"}
              </Button>
            </div>
          </section>

          {/* Wide screens: composer + break settings rail on the left, the
              scheduled list fills the rest. Stacks vertically below xl. */}
          <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-lg items-start">
            <div className="flex flex-col gap-lg min-w-0">
              {/* New reminder composer */}
              <section
                className="rounded-xl p-xl border"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
              >
                <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">
                  New reminder
                </h2>
                <p className="text-[13px] text-text-muted mb-lg">
                  What should we remind you about, and when?
                </p>

                <div className="flex flex-col gap-md">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reminderText" className="text-[12px] font-semibold text-text-secondary">
                      Reminder
                    </label>
                    <Input
                      id="reminderText"
                      type="text"
                      value={text}
                      onChange={(e) => { setText(e.target.value); setFormError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                      placeholder="Drink water, review daily plan..."
                      className="bg-surface-mid border-border-subtle"
                    />
                  </div>

                  <div className="flex flex-wrap items-start gap-md">
                    <div className="flex flex-col gap-1.5 w-32 shrink-0">
                      <label htmlFor="reminderTime" className="text-[12px] font-semibold text-text-secondary">
                        Time
                      </label>
                      <Input
                        id="reminderTime"
                        type="time"
                        value={time}
                        onChange={(e) => { setTime(e.target.value); setFormError(""); }}
                        className="bg-surface-mid border-border-subtle"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-[12px] font-semibold text-text-secondary">Repeat</span>
                      <DayPicker value={days} onChange={setDays} />
                      <span className="text-[11px] text-text-faint">
                        {describeDays(days.length ? days : undefined)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={!text.trim()}
                    onClick={handleAdd}
                  >
                    <Plus size={14} /> Add Reminder
                  </Button>

                  {formError && (
                    <p className="text-[12px]" style={{ color: "var(--error)" }}>{formError}</p>
                  )}
                </div>
              </section>

              {/* Break reminders (interval-based, tied to focus sessions) */}
              <section
                className="rounded-xl p-xl border"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-start gap-3 mb-md">
                  <Checkbox
                    id="petBreakRemindersEnabled"
                    checked={breakRemindersEnabled}
                    onChange={(val) => setPreferences({ petBreakRemindersEnabled: val })}
                  />
                  <div
                    className="flex flex-col gap-0.5 select-none min-w-0"
                    onClick={() => setPreferences({ petBreakRemindersEnabled: !breakRemindersEnabled })}
                  >
                    <label htmlFor="petBreakRemindersEnabled" className="text-[15px] font-semibold text-text-primary cursor-pointer">
                      Break reminders during focus sessions
                    </label>
                    <p className="text-[12px] text-text-muted">
                      While a session is running, get nudged to stand up, stretch, or grab water on a fixed interval.
                    </p>
                  </div>
                </div>

                {breakRemindersEnabled && (
                  <div className="flex flex-col gap-1.5 pl-8 mt-sm">
                    <label className="text-[11px] font-semibold text-text-secondary">Remind me every</label>
                    <div className="flex flex-wrap items-center gap-sm">
                      <Input
                        type="number"
                        min="5"
                        max="300"
                        value={breakIntervalMinutes}
                        onChange={(e) => setPreferences({ petBreakIntervalMinutes: Number(e.target.value) })}
                        onBlur={(e) => {
                          const raw = Number(e.target.value);
                          const clamped = Number.isFinite(raw) && raw > 0 ? Math.min(Math.max(raw, 5), 300) : 45;
                          if (clamped !== raw) setPreferences({ petBreakIntervalMinutes: clamped });
                        }}
                        className="bg-surface-mid border-border-subtle text-[13px] w-24"
                      />
                      <span className="text-[13px] text-text-muted">minutes of focused work</span>
                    </div>
                    <p className="text-[11px] text-text-faint">Between 5 and 300 minutes. Delivered by the desktop mascot.</p>
                  </div>
                )}
              </section>
            </div>

            {/* Reminder list */}
            <section
              className="rounded-xl p-xl border min-w-0"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between mb-lg">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-0.012em] text-text-primary mb-1">
                    Scheduled reminders
                  </h2>
                  <p className="text-[13px] text-text-muted">
                    {reminders.length === 0
                      ? "Nothing scheduled yet."
                      : `${reminders.length} reminder${reminders.length === 1 ? "" : "s"} · ${reminders.filter((r) => r.active).length} active`}
                  </p>
                </div>
              </div>

              {sortedReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-xl bg-surface rounded-lg text-center gap-md border border-dashed border-border">
                  <Bell size={32} className="text-text-faint" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[14px] font-semibold text-text-primary">No reminders scheduled</p>
                    <p className="text-[12px] text-text-muted max-w-[300px]">
                      Add your first reminder — hydration nudges, standup prep, end-of-day review, anything.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden border border-border-subtle rounded-lg divide-y divide-border-subtle">
                  {sortedReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className={cn(
                        "flex items-center justify-between gap-sm px-md py-sm hover:bg-surface-mid transition-colors",
                        !rem.active && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          id={`rem-active-${rem.id}`}
                          checked={rem.active}
                          onChange={(checked) =>
                            saveReminders(reminders.map((r) => (r.id === rem.id ? { ...r, active: checked } : r)))
                          }
                        />
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[14px] font-medium text-text-primary truncate">{rem.text}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                            <Clock size={11} className="text-accent shrink-0" />
                            <span className="text-accent font-semibold">{formatTime12h(rem.time)}</span>
                            <span>· {describeDays(rem.days)}</span>
                            {!rem.active && <span>· paused</span>}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          title="Edit reminder"
                          onClick={() => openEdit(rem)}
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-error"
                          title="Delete reminder"
                          onClick={() => {
                            saveReminders(reminders.filter((r) => r.id !== rem.id));
                            notify({
                              title: "Reminder removed",
                              description: "The scheduled reminder was deleted.",
                              tone: "info",
                            });
                          }}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </PageContent>

      {/* Edit reminder modal */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit Reminder">
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="editReminderText" className="text-[12px] font-semibold text-text-secondary">
              Reminder
            </label>
            <Input
              id="editReminderText"
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="editReminderTime" className="text-[12px] font-semibold text-text-secondary">
              Time
            </label>
            <Input
              id="editReminderTime"
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Repeat</span>
            <div className="flex flex-wrap items-center gap-sm">
              <DayPicker value={editDays} onChange={setEditDays} />
              <span className="text-[11px] text-text-faint">
                {describeDays(editDays.length ? editDays : undefined)}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-sm mt-lg">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" disabled={!editText.trim()} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}

export default function RemindersPage() {
  return (
    <AuthGuard>
      <RemindersContent />
    </AuthGuard>
  );
}
