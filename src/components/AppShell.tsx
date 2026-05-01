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
  const { user, loading, configError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

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
    if (!loading && !user && !isAuthPage) {
      router.replace("/auth");
    }
  }, [user, loading, router, isAuthPage]);

  if (configError) {
    return <ConfigErrorScreen message={configError} />;
  }

  // Show full-screen loading while checking auth (skip on auth page)
  if ((loading || !user) && !isAuthPage) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-base">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="font-sans text-[14px] text-text-muted">
          {!user ? "Redirecting to sign in..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (isAuthPage) {
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

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-[rgba(239,68,68,0.25)] bg-surface p-8 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="mb-4 inline-flex rounded-full border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.12)] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.08em] text-[#ef4444]">
          Configuration error
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text-primary">
          Supabase environment variables are missing
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-text-muted">
          This deployment cannot initialize authentication until the required public environment variables are set in Vercel.
        </p>
        <div className="mt-6 rounded-xl border border-border-subtle bg-base p-4">
          <p className="text-[13px] font-medium text-text-primary">{message}</p>
        </div>
        <div className="mt-6 rounded-xl border border-border-subtle bg-base p-4 text-[13px] leading-7 text-text-secondary">
          Add these variables in your Vercel project settings:
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] text-text-primary">
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
          </pre>
        </div>
      </div>
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
