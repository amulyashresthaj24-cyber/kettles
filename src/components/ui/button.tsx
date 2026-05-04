import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium rounded-[8px] font-sans select-none " +
  "transition-[background,color,border-color,opacity,transform,box-shadow] duration-[120ms] ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-base " +
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
          "bg-transparent text-error hover:bg-error/10 hover:text-error",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
