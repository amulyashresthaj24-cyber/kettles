"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";
import { CheckCircle, Info, Warning, X } from "./icon";

type NotificationTone = "info" | "success" | "warning" | "error";

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  title: string;
  description?: string;
  tone: NotificationTone;
  action?: NotificationAction;
  durationMs?: number;
}

interface NotificationContextValue {
  notify: (notification: Omit<Notification, "id"> & { durationMs?: number }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toneIcon = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  error: Warning,
};

// A helper pauseable timer class to handle pausing and resuming toast auto-dismiss
class PauseableTimer {
  private timerId: any = null;
  private startTime: number = 0;
  private remaining: number;
  private callback: () => void;

  constructor(callback: () => void, delay: number) {
    this.callback = callback;
    this.remaining = delay;
    this.resume();
  }

  pause() {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
      this.remaining -= Date.now() - this.startTime;
    }
  }

  resume() {
    if (!this.timerId && this.remaining > 0) {
      this.startTime = Date.now();
      this.timerId = window.setTimeout(this.callback, this.remaining);
    }
  }

  clear() {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.remaining = 0;
  }
}

function ToastItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<PauseableTimer | null>(null);
  const durationMs = notification.durationMs ?? 3600;

  const triggerDismiss = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.clear();
    }
    setIsExiting(true);
  }, []);

  // When isExiting transitions to true, wait for the slide-out animation to finish
  useEffect(() => {
    if (isExiting) {
      const exitTimeout = window.setTimeout(() => {
        onDismiss(notification.id);
      }, 200); // matches the slide-out duration
      return () => window.clearTimeout(exitTimeout);
    }
  }, [isExiting, onDismiss, notification.id]);

  // Set up the auto-dismiss timer on mount
  useEffect(() => {
    timerRef.current = new PauseableTimer(triggerDismiss, durationMs);
    return () => {
      if (timerRef.current) {
        timerRef.current.clear();
      }
    };
  }, [triggerDismiss, durationMs]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      timerRef.current.pause();
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      timerRef.current.resume();
    }
  };

  const Icon = toneIcon[notification.tone];

  // Map tone to specific colors, borders, and glows
  const toneStyles = {
    success: {
      borderLeft: "4px solid var(--success)",
      iconClass: "text-success",
      iconColor: "var(--success)",
      glowColor: "color-mix(in srgb, var(--success) 12%, transparent)",
    },
    warning: {
      borderLeft: "4px solid var(--warning)",
      iconClass: "text-warning",
      iconColor: "var(--warning)",
      glowColor: "color-mix(in srgb, var(--warning) 12%, transparent)",
    },
    info: {
      borderLeft: "4px solid var(--info)",
      iconClass: "text-text-muted",
      iconColor: "var(--info)",
      glowColor: "color-mix(in srgb, var(--info) 10%, transparent)",
    },
    error: {
      borderLeft: "4px solid var(--error)",
      iconClass: "text-error",
      iconColor: "var(--error)",
      glowColor: "color-mix(in srgb, var(--error) 12%, transparent)",
    },
  }[notification.tone];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`toast-item pointer-events-auto rounded-xl p-3.5 relative overflow-hidden transition-[opacity,transform] duration-base ${
        isExiting ? "animate-slide-out-right" : "animate-slide-in-right"
      }`}
      style={{
        background: "var(--surface-glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border-subtle)",
        borderLeft: toneStyles.borderLeft,
        // Tone glow on top of the shared elevation, so toasts sit at one
        // consistent height with every other overlay.
        boxShadow: `0 12px 30px -10px ${toneStyles.glowColor}, var(--elevation-4)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon
            size={16}
            className={toneStyles.iconClass}
            style={{ color: toneStyles.iconColor }}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary tracking-tight leading-none">{notification.title}</p>
          {notification.description && (
            <p className="mt-1 text-[12px] leading-snug text-text-muted">{notification.description}</p>
          )}
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                triggerDismiss();
              }}
              className="mt-2 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors px-2 py-0.5 rounded bg-accent/8 hover:bg-accent/15 w-fit block focus-ring"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          className="text-text-muted hover:text-text-primary hover:bg-text-primary/5 p-1 rounded-full transition-colors duration-fast shrink-0 focus-ring"
          onClick={triggerDismiss}
          aria-label="Dismiss notification"
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      {/* Shrinking progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border-subtle/20 overflow-hidden">
        <div
          className="toast-progress-bar w-full h-full"
          style={{
            "--toast-duration": `${durationMs}ms`,
            backgroundColor: toneStyles.iconColor,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (notification: Omit<Notification, "id"> & { durationMs?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Limit to showing the 3 most recent notifications at once
      setNotifications((items) => [...items.slice(-2), { ...notification, id }]);
    },
    []
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* polite, not assertive: toasts are confirmations and recoverable
          errors, so they should not interrupt what is being read. */}
      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed right-6 top-6 z-toast flex w-[360px] max-w-[calc(100vw-48px)] flex-col gap-2.5"
      >
        {notifications.map((notification) => (
          <ToastItem
            key={notification.id}
            notification={notification}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
}
