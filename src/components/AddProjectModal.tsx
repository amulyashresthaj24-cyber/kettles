"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import type { ProjectColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X, Folder, Briefcase, DollarSign, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS: { value: ProjectColor; bg: string; ring: string }[] = [
  { value: "teal",   bg: "bg-teal-400",   ring: "ring-teal-400" },
  { value: "amber",  bg: "bg-amber-400",  ring: "ring-amber-400" },
  { value: "rose",   bg: "bg-rose-400",   ring: "ring-rose-400" },
  { value: "indigo", bg: "bg-indigo-400", ring: "ring-indigo-400" },
];

export function AddProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useApp((s) => s.clients);
  const addProject = useApp((s) => s.addProject);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [color, setColor] = useState<ProjectColor>("teal");
  const [billable, setBillable] = useState(true);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setClientId("");
      setColor("teal");
      setBillable(true);
      setClientOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, name]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addProject({ name: name.trim(), clientId: clientId || undefined, color, billable });
    onClose();
  };

  const selectedClient = clients.find((c) => c.id === clientId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-lg">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-modal-in relative w-full max-w-[520px] bg-surface-raised rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border-subtle">

        {/* Breadcrumb header */}
        <div className="flex items-center justify-between px-xl py-md border-b border-border-subtle">
          <div className="flex items-center gap-sm text-[13px] text-text-muted">
            <Folder size={13} />
            <span className="text-text-secondary font-medium">New project</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-faint hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-md px-xl pt-xl pb-lg">
          <input
            autoFocus
            className="w-full bg-transparent border-none outline-none text-[22px] font-semibold text-text-primary placeholder:text-text-faint leading-snug"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            rows={2}
            className="w-full resize-none bg-transparent border-none outline-none text-[14px] text-text-secondary placeholder:text-text-muted leading-relaxed"
            placeholder="Add description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Footer pill row */}
        <div className="flex items-center justify-between gap-sm px-xl py-lg border-t border-border-subtle">
          <div className="flex items-center gap-sm flex-wrap">

            {/* Client picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setClientOpen((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-mid text-[12px] font-medium text-text-secondary transition-colors"
              >
                <Briefcase size={12} className="text-text-muted" />
                <span>{selectedClient ? selectedClient.name : "No client"}</span>
                <ChevronDown size={11} className="text-text-faint" />
              </button>
              {clientOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setClientOpen(false)} />
                  <div className="absolute bottom-full mb-2 left-0 min-w-[180px] bg-surface-raised border border-border rounded-lg shadow-2xl z-[60] py-1 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setClientId(""); setClientOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 text-[13px] transition-colors", !clientId ? "text-text-primary bg-surface-mid" : "text-text-secondary hover:bg-surface-mid hover:text-text-primary")}
                    >
                      No client
                    </button>
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClientId(c.id); setClientOpen(false); }}
                        className={cn("w-full text-left px-3 py-2 text-[13px] transition-colors", clientId === c.id ? "text-text-primary bg-surface-mid" : "text-text-secondary hover:bg-surface-mid hover:text-text-primary")}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Color swatches */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-mid transition-colors">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all",
                    c.bg,
                    color === c.value ? `ring-2 ring-offset-1 ring-offset-surface-raised ${c.ring} scale-110` : "hover:scale-110 opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>

            {/* Billable toggle */}
            <button
              type="button"
              onClick={() => setBillable((b) => !b)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors",
                billable
                  ? "bg-accent/15 text-accent"
                  : "bg-surface hover:bg-surface-mid text-text-muted"
              )}
            >
              <DollarSign size={12} />
              <span>Billable</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!name.trim()}
            >
              Create project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
