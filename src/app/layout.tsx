import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
import { getSiteOrigin } from "@/lib/site-url";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  buildOpenGraph,
  buildTwitter,
} from "@/lib/site-metadata";

/* Self-hosted by next/font: no render-blocking @import, no extra round-trip
   to Google, and no layout shift. Weights cover what the UI actually uses —
   800/900 were previously synthesised because the old import stopped at 700. */
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-urbanist",
  display: "swap",
});

/* tailwind.config maps font-mono to --font-geist-mono, which nothing ever
   defined — every font-mono surface fell back to the browser default.
   Geist Mono is the documented mono face (Docs/design.md) but is not in
   next/font/google's manifest on Next 14, so it comes from the official
   self-hosted `geist` package, which exposes --font-geist-mono. */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/images/kettlesicon.svg",
  },
  openGraph: buildOpenGraph(SITE_NAME, SITE_DESCRIPTION),
  twitter: buildTwitter(SITE_NAME, SITE_DESCRIPTION),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${urbanist.variable} ${GeistMono.variable}`}>
      <body className="bg-base font-sans text-text-primary antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
