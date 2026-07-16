/**
 * Save a file to the user's machine.
 * Prefers the native Save dialog (File System Access API) so the user
 * picks the folder; falls back to a browser download link.
 */

export type SaveLocalResult =
  | { ok: true; method: "picker" | "download"; filename: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

export interface SaveLocalOptions {
  filename: string;
  blob: Blob;
  /** MIME + extensions for the save picker. */
  mimeType: string;
  extension: string;
  description?: string;
}

function triggerAnchorDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after the browser has a chance to start the download
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export async function saveLocalFile(opts: SaveLocalOptions): Promise<SaveLocalResult> {
  const { filename, blob, mimeType, extension, description } = opts;

  // Native "Save as…" when the browser/desktop shell supports it
  const picker = typeof window !== "undefined"
    ? (window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker
    : undefined;

  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: description ?? extension.toUpperCase(),
            accept: { [mimeType]: [extension.startsWith(".") ? extension : `.${extension}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, method: "picker", filename };
    } catch (err) {
      // User cancelled the dialog
      if (err instanceof DOMException && (err.name === "AbortError" || err.name === "NotAllowedError")) {
        return { ok: false, cancelled: true };
      }
      // Picker failed — fall through to anchor download
      console.warn("Save file picker failed, falling back to download", err);
    }
  }

  try {
    triggerAnchorDownload(filename, blob);
    return { ok: true, method: "download", filename };
  } catch (err) {
    return {
      ok: false,
      cancelled: false,
      error: err instanceof Error ? err.message : "Could not start download",
    };
  }
}
