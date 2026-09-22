import type { Metadata } from "next";
import KettlesLanding from "@/components/marketing/KettlesLanding";
import { landingFaqJsonLd } from "@/lib/landing-faq";
import { SITE_DESCRIPTION, SITE_TITLE, buildOpenGraph, buildTwitter } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: buildOpenGraph(SITE_TITLE, SITE_DESCRIPTION),
  twitter: buildTwitter(SITE_TITLE, SITE_DESCRIPTION),
};

export default function LandingPage() {
  const faqJsonLd = JSON.stringify(landingFaqJsonLd()).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <KettlesLanding />
    </>
  );
}
