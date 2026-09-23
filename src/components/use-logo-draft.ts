"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isOnline } from "@/lib/desktop";
import { validateLogoInput } from "@/lib/project-logo";

/** Pending logo file for the project form. Upload happens on save. */
export function useLogoDraft() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const replacePreview = useCallback((next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreviewUrl(next);
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setRemoved(false);
    setError(null);
    replacePreview(null);
  }, [replacePreview]);

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
    setError(null);
    setRemoved(false);
    setFile(next);
    replacePreview(URL.createObjectURL(next));
  }, [replacePreview]);

  const clear = useCallback(() => {
    setFile(null);
    setRemoved(true);
    setError(null);
    replacePreview(null);
  }, [replacePreview]);

  return { file, previewUrl, removed, error, setError, pick, clear, reset };
}
