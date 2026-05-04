"use client";

import { Warning } from "@/components/ui/icon";
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error">
            <Warning size={16} aria-hidden />
          </div>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-sm">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            className="bg-error/10 hover:bg-error/20"
          >
            {pending ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
