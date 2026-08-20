import type { Metadata } from "next";
import KettlesLanding from "@/components/marketing/KettlesLanding";
import { buildOpenGraph, buildTwitter } from "@/lib/site-metadata";

const TITLE = "Kettles — Put the kettle on. Bill every minute.";
const DESCRIPTION =
  "Task-linked time tracking that turns deep work into a cozy daily ritual — every minute brews into an accurate, billable record.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: buildOpenGraph(TITLE, DESCRIPTION),
  twitter: buildTwitter(TITLE, DESCRIPTION),
};

export default function LandingPage() {
  return <KettlesLanding />;
}
