import type { Metadata } from "next";

/**
 * Shared Open Graph / Twitter card pieces.
 *
 * Next.js overwrites nested metadata objects rather than merging them: a page
 * that declares `openGraph` loses everything the root layout put there. So any
 * page overriding the share copy must rebuild the whole object — these helpers
 * keep the image and site name identical everywhere.
 */

export const SITE_NAME = "Kettles";
/** Public homepage title. App routes keep the short `SITE_NAME` tab title. */
export const SITE_TITLE = "Kettles — Time tracking for freelancers";
export const SITE_DESCRIPTION =
  "Task-linked time tracking for freelancers. Start a timer on the task, and every minute lands in an invoice-ready report. Free to start.";

export const OG_IMAGE = {
  url: "/images/dashboard-shot.png",
  width: 2240,
  height: 1332,
  alt: "The Kettles dashboard, showing tracked time across tasks and projects",
};

export function buildOpenGraph(
  title: string,
  description: string,
  path = "/"
): Metadata["openGraph"] {
  return {
    type: "website",
    siteName: SITE_NAME,
    title,
    description,
    url: path,
    images: [OG_IMAGE],
  };
}

export function buildTwitter(title: string, description: string): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMAGE],
  };
}
