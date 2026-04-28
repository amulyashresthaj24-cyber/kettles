"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Due date" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const ref = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

  // Sync current month when modal opens or value changes
  useEffect(() => {
    if (open) {
      if (value) {
        const d = new Date(value);
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      } else {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      }
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function handleDayClick(day: number) {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = newDate.toISOString().split("T")[0];
    onChange(dateStr);
    setOpen(false);
  }

  function handlePrev() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function handleNext() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className="relative z-40" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors"
      >
        <Calendar size={12} className="text-text-muted shrink-0" />
        <span>{displayValue || placeholder}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 bg-surface-raised border border-border rounded-lg shadow-2xl z-[9999] p-4 w-80 pointer-events-auto"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-surface-mid"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-surface-mid"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_SHORT.map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-faint)" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className="w-8 h-8 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: isSelected ? "var(--accent)" : isToday ? "var(--surface-mid)" : "transparent",
                    color: isSelected ? "white" : isToday ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full mt-3 py-2 text-[12px] font-medium rounded-md transition-colors"
              style={{
                background: "var(--surface-mid)",
                color: "var(--text-muted)",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
