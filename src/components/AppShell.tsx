"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { KettleLoader } from "./KettleLoader";
import { ActiveSessionBanner } from "./ActiveSessionBanner";
import { CommandPalette } from "./CommandPalette";
import { AddTaskModal } from "./AddTaskModal";
import { AddProjectModal } from "./AddProjectModal";
import { useAuth } from "@/lib/auth";
import { NotificationProvider } from "./ui/notification";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";
  const isOnboardingPage = pathname === "/onboarding";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Redirect to auth if not logged in (but not on auth page)
  useEffect(() => {
    if (!loading && !user && !isAuthPage && !isOnboardingPage) {
      router.replace("/auth");
    }
  }, [user, loading, router, isAuthPage, isOnboardingPage]);

  // Show full-screen loading while checking auth (skip on auth page)
  if ((loading || !user) && !isAuthPage && !isOnboardingPage) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-base">
        <KettleLoader message={loading ? "Loading your workspace..." : "Redirecting to sign in..."} />
      </div>
    );
  }

  if (isAuthPage || isOnboardingPage) {
    return <>{children}</>;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar onSearchClick={() => setCmdOpen(true)} />
        <main className="flex flex-1 flex-col overflow-hidden p-lg gap-lg">
          <div className="hidden md:block">
            <ActiveSessionBanner />
          </div>
          <div className="flex-1 overflow-hidden rounded-xl bg-base">
            <div className="h-full overflow-y-auto px-3xl pt-3xl [&:has(.no-shell-padding)]:p-0 [&:has(.no-shell-padding)]:overflow-hidden">
              <div className="flex flex-col gap-2xl [&:has(.no-shell-padding)]:gap-0 [&:has(.no-shell-padding)]:h-full">{children}</div>
            </div>
          </div>
          <MobileBanner />
        </main>

        <CommandPalette
          open={cmdOpen}
          onClose={() => setCmdOpen(false)}
          onNewTask={() => setTaskOpen(true)}
          onNewProject={() => setProjectOpen(true)}
        />
        <AddTaskModal open={taskOpen} onClose={() => setTaskOpen(false)} />
        <AddProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      </div>
    </NotificationProvider>
  );
}

function MobileBanner() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base p-2xl text-center md:hidden">
      <div className="flex max-w-[280px] flex-col gap-3 items-center">
        <div className="w-12 h-12 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-text-primary">Desktop required</h2>
          <p className="text-[13px] text-text-muted leading-relaxed">
            Kettles is optimized for desktop. Open it on your laptop or desktop for the full experience.
          </p>
        </div>
      </div>
    </div>
  );
}
