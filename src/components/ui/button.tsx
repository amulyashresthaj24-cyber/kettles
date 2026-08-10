import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium rounded-control font-sans select-none " +
  "transition-[background,color,border-color,opacity,transform,box-shadow] duration-fast ease-out-soft " +
  "focus-ring " +
  "disabled:pointer-events-none disabled:opacity-40 " +
  "active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md",
        secondary:
          "bg-surface-raised text-text-primary hover:bg-surface-mid border border-border-subtle hover:border-border",
        toolbar:
          "bg-surface-raised text-text-secondary hover:text-text-primary hover:bg-surface-mid border border-border-subtle hover:border-border",
        "primary-rounded":
          "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md",
        "secondary-rounded":
          "bg-surface-raised text-text-primary hover:bg-surface-mid border border-border-subtle hover:border-border",
        ghost:
          "bg-transparent text-text-muted hover:text-text-primary hover:bg-surface-raised",
        subtle:
          "bg-transparent text-text-muted hover:text-text-secondary",
        filter:
          "bg-surface-raised text-text-secondary hover:text-text-primary border border-border hover:border-border-subtle hover:bg-surface-mid",
        danger:
          "bg-transparent text-error hover:bg-error-subtle hover:text-error",
      },
      size: {
        default: "h-9 px-4 text-[14px]",
        sm: "h-8 px-3 text-[13px]",
        xs: "h-7 px-2.5 text-[12px]",
        lg: "h-10 px-5 text-[15px]",
        icon: "h-9 w-9 text-[14px]",
        "icon-sm": "h-8 w-8 text-[13px]",
        "icon-xs": "h-7 w-7 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Swaps the leading content for a spinner and disables the button. Callers
   * used to hand-roll this — ConfirmDialog swapped its label text to
   * "Deleting..." regardless of what confirmLabel said.
   */
  loading?: boolean;
}

const SPINNER_SIZE: Record<string, number> = {
  lg: 16,
  default: 15,
  sm: 14,
  xs: 12,
  icon: 15,
  "icon-sm": 14,
  "icon-xs": 12,
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // asChild renders an arbitrary child; injecting a spinner would break the
    // single-child contract Slot requires.
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Spinner
            size={SPINNER_SIZE[size ?? "default"] ?? 15}
            weight="regular"
            className="animate-spin shrink-0"
            aria-hidden
          />
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
