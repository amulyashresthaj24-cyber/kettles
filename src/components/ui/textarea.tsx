import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[72px] w-full rounded-[8px] border border-border bg-surface-mid px-md py-sm text-[14px] text-text-primary",
      "placeholder:text-text-muted focus-visible:outline-none focus-visible:border-accent disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
