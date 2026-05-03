"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-lg">
        <div className="flex gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error">
            <AlertTriangle size={18} />
          </div>
          <p className="text-[14px] leading-relaxed text-text-secondary">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-sm">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            className="text-error hover:text-error"
          >
            {pending ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
