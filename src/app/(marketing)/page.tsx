import type { Metadata } from "next";
import KettlesLanding from "@/components/marketing/KettlesLanding";

export const metadata: Metadata = {
  title: "Kettles — Put the kettle on. Bill every minute.",
  description:
    "Task-linked time tracking that turns deep work into a cozy daily ritual — every minute brews into an accurate, billable record.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return <KettlesLanding />;
}
