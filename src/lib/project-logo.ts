/**
 * Project logo contract. The image lives in the private `project-logos` bucket.
 * The project row stores only `logoPath`. Keep the path regex in sync with
 * `canonicalLogoPath` in `supabase/functions/_shared/validators.ts`.
 */

export const PROJECT_LOGO_BUCKET = "project-logos";
export const PROJECT_LOGO_SIZE = 256;
export const PROJECT_LOGO_MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const PROJECT_LOGO_MAX_OUTPUT_BYTES = 480 * 1024;

const LOGO_PATH =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(webp|png)$/i;

const INPUT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const EXT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export type LogoExt = "webp" | "png";

export function projectLogoObjectPath(userId: string, projectId: string, ext: LogoExt): string {
  return `${userId.toLowerCase()}/${projectId.toLowerCase()}.${ext}`;
}

/** True when `path` is a logo object this user is allowed to store. */
export function isProjectLogoPath(path: string, userId?: string): boolean {
  const match = LOGO_PATH.exec(path);
  if (!match) return false;
  if (userId && match[1].toLowerCase() !== userId.toLowerCase()) return false;
  return true;
}

export function canonicalLogoPath(path: string, userId: string): string | null {
  const match = LOGO_PATH.exec(path);
  if (!match) return null;
  if (match[1].toLowerCase() !== userId.toLowerCase()) return null;
  return `${match[1].toLowerCase()}/${match[2].toLowerCase()}.${match[3].toLowerCase()}`;
}

export function logoInputType(file: { type: string; name: string }): string | null {
  const type = file.type.toLowerCase();
  if (INPUT_TYPES.has(type)) return type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? null;
}

/** Returns an error message, or null when the file can be rasterized. */
export function validateLogoInput(file: { type: string; size: number; name: string }): string | null {
  if (!logoInputType(file)) return "Use a PNG, JPEG, WebP, or SVG logo.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "That file is empty.";
  if (file.size > PROJECT_LOGO_MAX_INPUT_BYTES) return "Logo must be under 2 MB.";
  return null;
}

/** Signed or local-dev logo URLs only. Never treat `logoPath` as an image src. */
export function isDisplayableLogoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
