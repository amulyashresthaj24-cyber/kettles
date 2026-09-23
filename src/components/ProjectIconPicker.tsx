"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, PROJECT_ICONS, getProjectColor, resolveProjectIcon } from "@/lib/constants";
import { AppIcon, type IconName } from "@/components/ui/icon";
import { UploadSimple, X } from "@/components/ui/icon";

interface Props {
  icon: string;
  color: string;
  logoPreviewUrl?: string | null;
  logoError?: string | null;
  onChange: (icon: string, color: string) => void;
  onLogoFile: (file: File) => void;
  onLogoClear: () => void;
}

export function ProjectIconPicker({
  icon,
  color,
  logoPreviewUrl,
  logoError,
  onChange,
  onLogoFile,
  onLogoClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const colorMeta = getProjectColor(color);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title="Change logo, icon, and color"
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl transition-all duration-150 hover:scale-105 active:scale-95"
        style={{ background: logoPreviewUrl ? "var(--surface-mid)" : colorMeta.hex + "20" }}
      >
        {logoPreviewUrl ? (
          <img src={logoPreviewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <AppIcon
            name={resolveProjectIcon(icon) as IconName}
            size={24}
            weight="regular"
            style={{ color: colorMeta.hex }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-dropdown w-[288px] rounded-lg border border-border-subtle bg-surface-raised shadow-elevation-2 animate-dropdown-in overflow-hidden"
        >
          <div className="px-3 pt-3 pb-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-text-faint">
              Color
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.id}
                  onClick={() => onChange(icon, c.id)}
                  className="h-7 w-7 rounded-lg transition-all duration-100 hover:scale-110 active:scale-95"
                  style={{
                    background: c.hex,
                    outline: color === c.id ? `2px solid ${c.hex}` : "none",
                    outlineOffset: color === c.id ? "2px" : "0",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mx-3 h-px" style={{ background: "var(--border-subtle)" }} />

          <div className="px-3 pb-2 pt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-text-faint">
              Logo
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-mid hover:text-text-primary"
              >
                <UploadSimple size={14} />
                Upload logo
              </button>
              {logoPreviewUrl && (
                <button
                  type="button"
                  onClick={onLogoClear}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text-primary"
                >
                  <X size={12} />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onLogoFile(file);
              }}
            />
            {logoError && (
              <p className="mt-1.5 text-[11px] leading-snug text-error">{logoError}</p>
            )}
          </div>

          <div className="mx-3 h-px" style={{ background: "var(--border-subtle)" }} />

          <div className="px-3 pb-3 pt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-text-faint">
              Icon
            </p>
            <div className="grid grid-cols-6 gap-1">
              {PROJECT_ICONS.map((key) => {
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={() => { onChange(key, color); setOpen(false); }}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-100 hover:scale-110 active:scale-95",
                      active ? "" : "hover:bg-[--surface-mid]",
                    )}
                    style={
                      active
                        ? { background: colorMeta.hex + "20", outline: `2px solid ${colorMeta.hex}`, outlineOffset: "0px" }
                        : {}
                    }
                  >
                    <AppIcon
                      name={key as IconName}
                      size={16}
                      weight={active ? "bold" : "regular"}
                      style={{ color: active ? colorMeta.hex : "var(--text-muted)" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
