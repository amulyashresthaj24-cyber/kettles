import type { Metadata } from "next";
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
    <html lang="en">
      <body className="bg-base font-sans text-text-primary antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
