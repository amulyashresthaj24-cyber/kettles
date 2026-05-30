"use client";

import { KettleAnimation } from "./KettleAnimation";

interface KettleLoaderProps {
  message?: string;
  className?: string;
}

export function KettleLoader({ message, className = "" }: KettleLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-5 ${className}`}>
      <KettleAnimation size={80} />

      <p
        className="font-sans text-[13px]"
        style={{ color: "var(--text-muted)" }}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
        {message && <span aria-hidden="true">{message}</span>}
      </p>
    </div>
  );
}
