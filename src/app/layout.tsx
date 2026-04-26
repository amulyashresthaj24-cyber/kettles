import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowmate",
  description: "Unified productivity OS for solo workers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-base text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
