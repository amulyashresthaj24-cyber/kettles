"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle, Info, Warning, X } from "./icon";

type NotificationTone = "info" | "success" | "warning";

interface Notification {
  id: string;
  title: string;
  description?: string;
  tone: NotificationTone;
}

interface NotificationContextValue {
  notify: (notification: Omit<Notification, "id"> & { durationMs?: number }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toneIcon = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((notification: Omit<Notification, "id"> & { durationMs?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNotifications((items) => [...items.slice(-2), { ...notification, id }]);
    window.setTimeout(() => dismiss(id), notification.durationMs ?? 3600);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-6 top-6 z-[200] flex w-[360px] max-w-[calc(100vw-48px)] flex-col gap-2">
        {notifications.map((notification) => {
          const Icon = toneIcon[notification.tone];
          return (
            <div
              key={notification.id}
              className="pointer-events-auto animate-slide-in-right rounded-lg p-3 shadow-2xl"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <Icon
                  size={16}
                  className={notification.tone === "success" ? "text-status-success" : notification.tone === "warning" ? "text-warning" : "text-text-muted"}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-primary">{notification.title}</p>
                  {notification.description && <p className="mt-0.5 text-[12px] leading-snug text-text-muted">{notification.description}</p>}
                </div>
                <button className="text-text-muted hover:text-text-primary" onClick={() => dismiss(notification.id)} aria-label="Dismiss notification">
                  <X size={14} aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
}
