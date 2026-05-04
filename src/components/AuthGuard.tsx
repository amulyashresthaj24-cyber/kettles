"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/icon";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Redirect to auth page if not logged in and not loading
    if (!loading && !user && !isRedirecting) {
      setIsRedirecting(true);
      router.replace("/auth");
    }
  }, [user, loading, router, isRedirecting]);

  if (loading || isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size={32} weight="regular" className="text-text-muted animate-spin" aria-hidden />
        <p className="text-[14px] text-[#8a8f98] font-sans">
          {isRedirecting ? "Redirecting to sign in..." : "Loading..."}
        </p>
      </div>
    );
  }

  // Only render children if authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size={32} weight="regular" className="text-text-muted animate-spin" aria-hidden />
        <p className="text-[14px] text-[#8a8f98] font-sans">Redirecting to sign in...</p>
      </div>
    );
  }

  return <>{children}</>;
}
