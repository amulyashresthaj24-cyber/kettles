"use client";

import { useCallback, useState } from "react";
import { isOnline } from "@/lib/desktop";
import { validateLogoInput } from "@/lib/project-logo";

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

/** Pending logo file for the project form. Upload happens on save. */
export function useLogoDraft() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setRemoved(false);
    setError(null);
    setPreviewUrl(null);
  }, []);

  const pick = useCallback((next: File) => {
    const message = validateLogoInput(next);
    if (message) {
      setError(message);
      return;
    }
    if (!isOnline()) {
      setError("Connect to the internet to add a logo.");
      return;
    }

    // data: URLs are allowed by the desktop image policy. blob: URLs are not,
    // which made the preview and the save-time decode both fail.
    void readFileAsDataUrl(next)
      .then((url) => {
        setError(null);
        setRemoved(false);
        setFile(next);
        setPreviewUrl(url);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not read that logo.");
      });
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setRemoved(true);
    setError(null);
    setPreviewUrl(null);
  }, []);

  return { file, previewUrl, removed, error, setError, pick, clear, reset };
}
