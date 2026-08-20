import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // App surfaces behind auth, plus token-gated share links — nothing a
        // crawler can render, and share tokens should never be indexed.
        disallow: [
          "/auth",
          "/auth/callback",
          "/onboarding",
          "/dashboard",
          "/tasks",
          "/projects",
          "/timer",
          "/reminders",
          "/report",
          "/calendar",
          "/settings",
          "/share",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
