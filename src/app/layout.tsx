import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "FlowMast",
  description: "Task-linked time tracking for solo workers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-base font-sans text-text-primary antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
