"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LostKettleAnimation } from "@/components/LostKettleAnimation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @keyframes nf-ghost-breathe {
          0%, 100% { opacity: 0.032; }
          50%       { opacity: 0.055; }
        }
        @keyframes nf-divider-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .nf-ghost {
          animation: nf-ghost-breathe 5s ease-in-out infinite;
        }
        .nf-divider {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(51,133,255,0.4) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: nf-divider-shimmer 4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-ghost    { animation: none; opacity: 0.04; }
          .nf-divider  { animation: none; background: rgba(51,133,255,0.18); }
        }
      `}</style>

      {/*
        Negative margins break out of AppShell's content padding
        (px-3xl pt-3xl → we offset to reach the panel edges)
        so the 404 can fill the entire rounded panel area.
      */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 120px)",
          padding: "48px 24px 64px",
          overflow: "hidden",
        }}
      >

        {/* ── Ghost "404" background text ── */}
        <div
          className="nf-ghost"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -54%)",
            fontSize: "clamp(180px, 32vw, 340px)",
            fontWeight: 800,
            fontFamily: "var(--font-urbanist, sans-serif)",
            letterSpacing: "-0.06em",
            lineHeight: 1,
            color: "#3385ff",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
          aria-hidden="true"
        >
          404
        </div>

        {/* ── Outer radial gradient wash ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(0,102,255,0.06) 0%, transparent 72%)",
            pointerEvents: "none",
          }}
        />

        {/* ── Main composition ── */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            maxWidth: 560,
            width: "auto",
            textAlign: "center",
          }}
        >

          {/* Illustration */}
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <LostKettleAnimation />
          </div>

          {/* Text block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h1
              style={{
                fontFamily: "var(--font-urbanist, sans-serif)",
                fontSize: "clamp(26px, 4vw, 34px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              This page went off the boil.
            </h1>

            <p
              style={{
                fontFamily: "var(--font-urbanist, sans-serif)",
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                margin: 0,
                maxWidth: 360,
                alignSelf: "center",
              }}
            >
              The link may be broken, moved, or still brewing somewhere else.
            </p>
          </div>

          {/* Shimmer divider */}
          <div
            className="nf-divider"
            aria-hidden="true"
            style={{ width: 80, height: 1, borderRadius: 1 }}
          />

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Button asChild variant="primary" size="lg">
              <Link href="/">Go back home</Link>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.back()}
            >
              Return to previous page
            </Button>
          </div>

          {/* Error code — subtle label below buttons */}
          <p
            style={{
              fontFamily: "var(--font-urbanist, sans-serif)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "var(--text-faint)",
              textTransform: "uppercase",
              margin: 0,
            }}
            aria-label="Error code 404"
          >
            Error 404
          </p>
        </div>
      </div>
    </>
  );
}
