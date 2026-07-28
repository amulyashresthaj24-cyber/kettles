"use client";

/**
 * Inline client name field for a project — edits only the linked client.
 * Not a multi-client dropdown.
 */
export function ClientNameField({
  value,
  onChange,
  placeholder = "Add client",
  disabled,
  id,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Client name"
      className="min-w-[120px] max-w-[180px] px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary placeholder:text-text-faint outline-none border border-transparent focus:border-border focus:text-text-primary transition-colors disabled:opacity-50"
    />
  );
}

/** @deprecated Use ClientNameField — kept as alias during migration. */
export const ClientSelector = ClientNameField;
