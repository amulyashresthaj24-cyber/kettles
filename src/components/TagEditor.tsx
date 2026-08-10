"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus } from "@/components/ui/icon";
import { useApp } from "@/lib/store-supabase";
import type { Task } from "@/lib/types";

const SUGGESTED_TAGS = ["Design", "Planning", "Marketing", "Review", "Bug Fix", "Research", "Dev", "QA"];

interface TagEditorProps {
  task: Task;
}

export function TagEditor({ task }: TagEditorProps) {
  const updateTask = useApp((s) => s.updateTask);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = task.tags ?? [];

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    updateTask(task.id, { tags: [...tags, trimmed] });
    setSearch("");
  }

  function removeTag(tag: string) {
    updateTask(task.id, { tags: tags.filter((t) => t !== tag) });
  }

  const available = SUGGESTED_TAGS.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  );

  const canCreateNew = search.trim() && !tags.includes(search.trim()) && !SUGGESTED_TAGS.includes(search.trim());

  return (
    <div className="space-y-2 mt-1">
      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-[5px] text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-accent/15 transition-colors text-accent/80 hover:text-accent"
                aria-label={`Remove ${tag}`}
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add tag */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[6px] transition-colors hover:opacity-80"
          style={{ background: "var(--surface-mid)", color: "var(--text-muted)" }}
        >
          <Plus size={11} />
          Add tag
        </button>

        {isOpen && (
          <div
            className="absolute top-full mt-1 left-0 w-44 rounded-lg bg-surface-raised border border-border-subtle shadow-elevation-2 z-dropdown overflow-hidden animate-dropdown-in"
          >
            <div className="border-b border-border-subtle">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or create…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) { addTag(search); }
                  if (e.key === "Escape") { setIsOpen(false); setSearch(""); }
                }}
                className="w-full px-3 py-2 text-[12px] bg-transparent outline-none text-text-primary placeholder:text-text-faint"
              />
            </div>
            <div className="max-h-36 overflow-y-auto p-1">
              {canCreateNew && (
                <button
                  onClick={() => { addTag(search); setIsOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-surface-mid flex items-center gap-2 text-accent"
                >
                  <Plus size={11} />
                  Create &quot;{search.trim()}&quot;
                </button>
              )}
              {available.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { addTag(tag); setIsOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors hover:bg-surface-mid text-text-primary"
                >
                  {tag}
                </button>
              ))}
              {available.length === 0 && !canCreateNew && (
                <p className="px-2.5 py-2 text-[11px] text-text-faint">
                  No tags available
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
