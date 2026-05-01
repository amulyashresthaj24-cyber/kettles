import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";

function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL;
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const deploymentUrl = process.env.VERCEL_URL;
  const baseUrl = explicitUrl || productionUrl || deploymentUrl;

  if (!baseUrl) {
    return new URL("http://localhost:3000");
  }

  return new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
}

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Kettles",
  description: "Task-linked time tracking for focused work",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/images/kettlesicon.svg",
  },
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
