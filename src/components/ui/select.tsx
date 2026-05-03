import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
            "flex items-center justify-between font-normal transition-all outline-none",
            !isPill && "w-full border border-border-subtle bg-surface-raised text-text-primary",
            isPill && "gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary",
            !isPill && size === "sm" && "h-9 px-3 py-1 text-sm rounded-lg",
            !isPill && size === "md" && "h-10 px-3 py-2 text-sm rounded-lg",
            !isPill && size === "lg" && "h-11 px-4 py-2.5 text-base rounded-lg",
            !isPill && "hover:border-border transition-colors",
            !isPill && open && "border-accent",
            props.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={props.disabled}
        >
          <span className={cn("truncate", isPill && "max-w-[120px]")}>{selectedOption?.label}</span>
          <ChevronDown 
            size={isPill ? 11 : (size === "sm" ? 14 : 16)} 
            className={cn(
              "shrink-0 transition-transform",
              isPill ? "text-text-faint" : "text-text-muted",
              open && "rotate-180"
            )} 
            strokeWidth={2.5} 
          />
        </button>
        
        {open && !props.disabled && (
          <div className={cn(
            "absolute z-[100] w-full overflow-hidden border border-border-subtle bg-surface-raised shadow-lg animate-in fade-in-0 zoom-in-95",
            isPill ? "bottom-full mb-2 rounded-lg py-1 min-w-[160px]" : "top-full mt-1 rounded-lg py-1"
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
