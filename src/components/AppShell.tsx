"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { KettleLoader } from "./KettleLoader";
import { useAuth } from "@/lib/auth";
import { NotificationProvider } from "./ui/notification";
import { getSyncEngine } from "@/lib/sync-engine";
import { isDesktop } from "@/lib/desktop";
import { useApp } from "@/lib/store-supabase";

const ActiveSessionBanner = dynamic(
  () => import("./ActiveSessionBanner").then((mod) => mod.ActiveSessionBanner),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false }
);
const AddTaskModal = dynamic(
  () => import("./AddTaskModal").then((mod) => mod.AddTaskModal),
  { ssr: false }
);
const AddProjectModal = dynamic(
  () => import("./AddProjectModal").then((mod) => mod.AddProjectModal),
  { ssr: false }
);
const DesktopShell = dynamic(
  () => import("./DesktopShell").then((mod) => mod.DesktopShell),
  { ssr: false }
);
const ReminderAgent = dynamic(
  () => import("./ReminderAgent").then((mod) => mod.ReminderAgent),
  { ssr: false }
);
const SyncStatusBadge = dynamic(
  () => import("./SyncStatusBadge").then((mod) => mod.SyncStatusBadge),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname ? pathname.startsWith("/auth") : false;
  const isOnboardingPage = pathname === "/onboarding";
  const isMiniTimerPage = pathname === "/mini-timer";
  // Public marketing pages (landing, legal, etc) render outside the app chrome
  // and are not auth-guarded. Keep this list in sync with src/app/(marketing).
  const isLandingPage = pathname === "/";
  const isLegalPage = pathname ? pathname.startsWith("/legal") : false;
  const isMarketingPage = isLandingPage || isLegalPage;
  const isSharePage = pathname ? pathname.startsWith("/share") : false;
  const isPublicPage = isMarketingPage || isSharePage;
  // The desktop app has no use for the public landing page — go straight to
  // the app (sign in, or the dashboard if already authed).
  // NOTE: isDesktop() reads window globals, which differ between SSR (false)
  // and the Tauri webview (true). Reading it during render desyncs the first
  // client paint from the server HTML → hydration error. Resolve after mount.
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  useEffect(() => {
    setIsDesktopApp(isDesktop());
  }, []);

  // Boot the offline sync engine early so its connectivity listener is
  // registered before the app ever goes offline / comes back online.
  // Skip on public share pages — no private workspace sync needed.
  useEffect(() => {
    if (isSharePage) return;
    getSyncEngine();
  }, [isSharePage]);

  // Preference writes are debounced, so a tab closed or backgrounded within
  // that window would drop the pending edit. Flush on the way out.
  //
  // Best-effort by nature: on a real `pagehide` the browser may kill the
  // document before the fetch completes. The edit is not lost — it stays in
  // the persisted store with preferencesDirty set, and the next loadProfile
  // pushes it. visibilitychange fires earlier and usually wins the race.
  useEffect(() => {
    if (isSharePage) return;
    const flush = () => {
      if (useApp.getState().preferencesDirty) {
        void useApp.getState().flushPreferences();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [isSharePage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((p) => !p);
      }
    };
    if (isSharePage) return;
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSharePage]);

  useEffect(() => {
    const syncTheme = () => {
      const stored = window.localStorage.getItem("flowmate-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      } else {
        setTheme("dark");
      }
    };
    syncTheme();

    window.addEventListener("flowmate-theme-changed", syncTheme);
    return () => window.removeEventListener("flowmate-theme-changed", syncTheme);
  }, []);


  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("flowmate-theme", theme);
  }, [theme]);

  // Redirect to auth if not logged in (but not on auth/public pages)
  useEffect(() => {
    if (!loading && !user && !isAuthPage && !isOnboardingPage && !isPublicPage) {
      router.replace("/auth");
    }
  }, [user, loading, router, isAuthPage, isOnboardingPage, isPublicPage]);

  // Desktop app skips the public landing page entirely → sign in (or dashboard).
  // Legal pages stay reachable (e.g. from auth "Terms" links).
  useEffect(() => {
    if (isDesktopApp && isLandingPage && !loading) {
      router.replace(user ? "/dashboard" : "/auth");
    }
  }, [isDesktopApp, isLandingPage, loading, user, router]);

  // Public marketing / share pages bypass the app chrome and auth guard entirely —
  // except on desktop landing, where we show the loader while redirecting off it.
  if (isMarketingPage) {
    if (isDesktopApp && isLandingPage) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-base">
          <KettleLoader message="Loading your workspace..." />
        </div>
      );
    }
    return <>{children}</>;
  }

  if (isSharePage) {
    return <NotificationProvider>{children}</NotificationProvider>;
  }

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

  if (isMiniTimerPage) {
    return (
      <NotificationProvider>
        <DesktopShell />
        <ReminderAgent />
        {children}
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
      <DesktopShell />
      <ReminderAgent />
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar
          onSearchClick={() => setCmdOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        />
        <main className="flex flex-1 flex-col overflow-hidden p-lg gap-lg">
          <div className="hidden md:flex items-center gap-lg">
            <div className="flex-1">
              <ActiveSessionBanner />
            </div>
            <SyncStatusBadge />
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
  // The Tauri desktop app is never "mobile" — even when shrunk to mini-timer
  // size (340px wide), which would otherwise trip the md:hidden breakpoint.
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  useEffect(() => {
    setIsDesktopApp(isDesktop());
  }, []);
  if (isDesktopApp) return null;

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
