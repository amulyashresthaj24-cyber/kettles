"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KettleLoader } from "./KettleLoader";

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
      <div className="flex flex-col items-center justify-center h-full">
        <KettleLoader message={isRedirecting ? "Redirecting to sign in..." : undefined} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <KettleLoader message="Redirecting to sign in..." />
      </div>
    );
  }

  return <>{children}</>;
}
