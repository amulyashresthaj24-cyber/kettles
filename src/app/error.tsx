"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        padding: "48px 24px",
        textAlign: "center",
        gap: "24px",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "var(--surface-raised, rgba(255, 255, 255, 0.05))",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent, #3385ff)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: 420 }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Something went wrong
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          An unexpected error occurred while loading this view. You can try recovering below.
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <Button variant="primary" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Return to home
        </Button>
      </div>
    </div>
  );
}
