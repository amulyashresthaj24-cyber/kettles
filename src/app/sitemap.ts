import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-static";

/** Public, crawlable pages only — every other route is behind auth or a token. */
const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/legal/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/legal/terms", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    changeFrequency,
    priority,
  }));
}
