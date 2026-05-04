import * as React from "react";
import { cn } from "@/lib/utils";
import { CaretDown } from "@/components/ui/icon";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pill";
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, value, onChange, size = "md", variant = "default", ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    
    // Extract options
    const options: { value: string; label: React.ReactNode }[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        options.push({
          value: child.props.value,
          label: child.props.children
        });
      }
    });

    const selectedOption = options.find((o) => o.value === value) || options[0];

    // Close on click outside
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isPill = variant === "pill";

    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center justify-between font-normal outline-none select-none",
            "transition-[border-color,background,box-shadow] duration-[120ms] ease-out",
            !isPill && "w-full bg-surface-mid text-text-primary rounded-[8px]",
            isPill && "gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary",
            !isPill && size === "sm" && "h-9 px-3 text-[13px]",
            !isPill && size === "md" && "h-9 px-3 text-[14px]",
            !isPill && size === "lg" && "h-10 px-4 text-[15px]",
            !isPill && "hover:bg-surface-raised",
            !isPill && open && "ring-2 ring-accent/30",
            props.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={props.disabled}
        >
          <span className={cn("truncate", isPill && "max-w-[120px]")}>{selectedOption?.label}</span>
          <CaretDown 
            size={isPill ? 11 : (size === "sm" ? 14 : 16)} 
            className={cn(
              "shrink-0 transition-transform",
              isPill ? "text-text-faint" : "text-text-muted",
              open && "rotate-180"
            )} 
            weight="regular"
          />
        </button>
        
        {open && !props.disabled && (
          <div className={cn(
            "absolute z-[100] w-full overflow-hidden bg-surface-raised shadow-2xl animate-dropdown-in",
            isPill ? "bottom-full mb-2 rounded-lg py-1 min-w-[160px]" : "top-full mt-1 rounded-xl py-1"
          )}>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-left text-sm transition-colors outline-none",
                    isSelected
                      ? "bg-accent text-white font-medium"
                      : "text-text-primary hover:bg-surface-mid"
                  )}
                  onClick={() => {
                    onChange?.({ target: { value: opt.value } });
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
