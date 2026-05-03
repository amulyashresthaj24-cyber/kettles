"use client";

import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
  name?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  size = "md",
  className,
  id,
  name,
}: CheckboxProps) {
  const sizeClasses = {
    sm: "w-4 h-4 rounded-[3px]",
    md: "w-[18px] h-[18px] rounded-[5px]",
    lg: "w-5 h-5 rounded-[6px]",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled && onChange) {
        onChange(!checked);
      }
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      id={id}
      name={name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative flex items-center justify-center shrink-0 border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        sizeClasses[size],
        checked || indeterminate
          ? "bg-accent border-accent shadow-sm"
          : "bg-surface border-border hover:border-text-secondary",
        disabled && "opacity-50 cursor-not-allowed hover:border-border",
        className
      )}
    >
      {(checked || indeterminate) && (
        <svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-150"
        >
          {indeterminate ? (
            <path
              d="M2 6H10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M2 6L5 9L10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
    </button>
  );
}

// Native checkbox wrapper for form integration
export interface NativeCheckboxProps extends CheckboxProps {
  onNativeChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function NativeCheckbox({
  checked,
  onChange,
  onNativeChange,
  disabled = false,
  className,
  id,
  name,
}: NativeCheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNativeChange?.(e);
    onChange?.(e.target.checked);
  };

  return (
    <label
      className={cn(
        "relative flex items-center justify-center shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-150 cursor-pointer",
        checked
          ? "bg-accent border-accent shadow-sm"
          : "bg-surface border-border hover:border-text-secondary",
        disabled && "opacity-50 cursor-not-allowed hover:border-border",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        id={id}
        name={name}
        className="sr-only"
      />
      {checked && (
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 6L5 9L10 3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </label>
  );
}
