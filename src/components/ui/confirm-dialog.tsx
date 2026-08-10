"use client";

import * as React from "react";
import { Warning } from "@/components/ui/icon";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shown in place of confirmLabel while `pending`. Not every confirm deletes. */
  pendingLabel?: string;
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
  pendingLabel = "Deleting...",
  pending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  // Focus the confirm button on open, so Enter resolves the dialog. Neither
  // button used to take focus, which left Tab going to the page behind.
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      initialFocusRef={confirmRef}
      dismissible={!pending}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex gap-md">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error-subtle text-error">
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
            ref={confirmRef}
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={pending}
            className="bg-error-subtle hover:bg-error/20"
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
