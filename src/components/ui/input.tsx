import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full h-9 rounded-[8px] bg-surface-mid px-3 text-[14px] text-text-primary font-sans " +
          "placeholder:text-text-faint " +
          "transition-[box-shadow,background] duration-[120ms] ease-out " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:bg-surface-raised " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
