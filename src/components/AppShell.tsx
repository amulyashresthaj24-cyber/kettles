"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "./Sidebar";
import { ActiveSessionBanner } from "./ActiveSessionBanner";
import { CommandPalette } from "./CommandPalette";
import { AddTaskModal } from "./AddTaskModal";
import { AddProjectModal } from "./AddProjectModal";
import { useAuth } from "@/lib/auth";

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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-base">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="font-sans text-[14px] text-text-muted">
          {!user ? "Redirecting to sign in..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (isAuthPage || isOnboardingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar onSearchClick={() => setCmdOpen(true)} />
      <main className="flex flex-1 flex-col overflow-hidden p-lg gap-lg">
        <div className="hidden md:block">
          <ActiveSessionBanner />
        </div>
        <div className="flex-1 overflow-hidden rounded-xl bg-base">
          <div className="h-full overflow-y-auto px-3xl pt-3xl">
            <div className="flex flex-col gap-2xl">{children}</div>
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
  );
}

function MobileBanner() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface p-2xl text-center md:hidden">
      <div className="flex max-w-xs flex-col gap-md">
        <h2 className="text-[24px] font-semibold tracking-[-0.01em]">Switch to desktop</h2>
        <p className="text-[14px] text-text-muted">
          Kettles works best on a larger screen. Open this on your laptop or desktop.
        </p>
      </div>
    </div>
  );
}
