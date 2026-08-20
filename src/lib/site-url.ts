/**
 * Single source of truth for the public web origin.
 *
 * Used by auth redirects and share links (via supabase.ts) and by build-time
 * metadata (root layout `metadataBase`, robots.txt, sitemap.xml). Kept free of
 * the Supabase client so server metadata routes can import it safely.
 */

/** Production web origin for public links (never Tauri / localhost). */
export const DEFAULT_PUBLIC_SITE_URL = "https://www.kettles.works";

export function normalizeOrigin(url: string) {
  return url.replace(/\/$/, "");
}

/** True for real web hosts; false for Tauri, localhost, and other private origins. */
export function isPublicWebOrigin(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (host === "tauri.localhost" || host.endsWith(".localhost")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Build-time origin for canonical URLs, Open Graph tags, robots, and sitemap.
 *
 * These artifacts are baked into the static export and served to crawlers, so
 * this always resolves to a public origin — a localhost value from a dev
 * `.env.local` never leaks into shipped metadata.
 */
export function getSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const withProtocol = candidate.startsWith("http") ? candidate : `https://${candidate}`;
    if (isPublicWebOrigin(withProtocol)) return normalizeOrigin(withProtocol);
  }

  return DEFAULT_PUBLIC_SITE_URL;
}
