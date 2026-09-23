import { getSupabaseClient } from "./supabase";
import { isOnline } from "./desktop";
import {
  PROJECT_LOGO_BUCKET,
  PROJECT_LOGO_MAX_OUTPUT_BYTES,
  PROJECT_LOGO_SIZE,
  canonicalLogoPath,
  isDisplayableLogoUrl,
  isProjectLogoPath,
  projectLogoObjectPath,
  validateLogoInput,
  type LogoExt,
} from "./project-logo";

const SIGNED_TTL_SECONDS = 60 * 60;
const CACHE_SKEW_MS = 5 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };
const urlCache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

function notifyLogoListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeProjectLogoCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateProjectLogoUrl(path: string) {
  urlCache.delete(path);
  notifyLogoListeners();
}

async function currentUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Please sign in to continue");
  return data.user.id;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that logo."));
    };
    reader.onerror = () => reject(new Error("Could not read that logo."));
    reader.readAsDataURL(file);
  });
}

type DecodedLogo = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

/** Decode without a blob: URL. The desktop app's image policy blocks those. */
async function decodeLogo(file: File): Promise<DecodedLogo> {
  if (typeof createImageBitmap === "function" && file.type !== "image/svg+xml") {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
      }
      bitmap.close();
    } catch {
      // Fall through to a data URL, which the desktop image policy allows.
    }
  }

  const url = await readFileAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that logo. Use a PNG, JPEG, or WebP."));
    el.src = url;
  });
  return {
    source: img,
    width: img.naturalWidth || PROJECT_LOGO_SIZE,
    height: img.naturalHeight || PROJECT_LOGO_SIZE,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Square-crop a logo to 256px. SVG is rasterized and never stored. */
export async function rasterizeLogo(file: File): Promise<{ blob: Blob; ext: LogoExt; contentType: string }> {
  const invalid = validateLogoInput(file);
  if (invalid) throw new Error(invalid);
  if (typeof document === "undefined") throw new Error("Could not prepare the logo.");

  const image = await decodeLogo(file);
  const canvas = document.createElement("canvas");
  canvas.width = PROJECT_LOGO_SIZE;
  canvas.height = PROJECT_LOGO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the logo.");

  const scale = Math.max(PROJECT_LOGO_SIZE / image.width, PROJECT_LOGO_SIZE / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.clearRect(0, 0, PROJECT_LOGO_SIZE, PROJECT_LOGO_SIZE);
  ctx.drawImage(image.source, (PROJECT_LOGO_SIZE - width) / 2, (PROJECT_LOGO_SIZE - height) / 2, width, height);
  image.close?.();

  for (const quality of [0.9, 0.7, 0.5]) {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp" && webp.size > 0 && webp.size <= PROJECT_LOGO_MAX_OUTPUT_BYTES) {
      return { blob: webp, ext: "webp", contentType: "image/webp" };
    }
  }

  const png = await canvasToBlob(canvas, "image/png");
  if (!png || png.size <= 0 || png.size > PROJECT_LOGO_MAX_OUTPUT_BYTES) {
    throw new Error("That logo is too detailed to save. Try a simpler image.");
  }
  return { blob: png, ext: "png", contentType: "image/png" };
}

export async function uploadProjectLogo(projectId: string, file: File): Promise<string> {
  if (!isOnline()) throw new Error("Connect to the internet to add a logo.");
  const userId = await currentUserId();
  const prepared = await rasterizeLogo(file);
  const path = canonicalLogoPath(projectLogoObjectPath(userId, projectId, prepared.ext), userId);
  if (!path) throw new Error("Could not save the logo.");

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(PROJECT_LOGO_BUCKET).upload(path, prepared.blob, {
    contentType: prepared.contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error("Could not upload the logo.");
  invalidateProjectLogoUrl(path);
  return path;
}

export async function getProjectLogoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || !isProjectLogoPath(path)) return null;
  const hit = urlCache.get(path);
  if (hit && hit.expiresAt - CACHE_SKEW_MS > Date.now()) return hit.url;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(PROJECT_LOGO_BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl || !isDisplayableLogoUrl(data.signedUrl)) return null;
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/** PNG data URL for PDF embedding. Returns null when the image cannot be read. */
export async function projectLogoPngDataUrl(source: {
  logoPath?: string | null;
  logoUrl?: string | null;
}): Promise<string | null> {
  if (typeof document === "undefined") return null;
  let src: string | null = null;
  if (source.logoUrl && isDisplayableLogoUrl(source.logoUrl)) src = source.logoUrl;
  else if (source.logoPath) src = await getProjectLogoUrl(source.logoPath);
  if (!src) return null;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("logo"));
      el.src = src as string;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx || !img.naturalWidth) return null;
    ctx.drawImage(img, 0, 0, 64, 64);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
