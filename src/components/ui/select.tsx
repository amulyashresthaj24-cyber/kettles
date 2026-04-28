import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  size?: "sm" | "md";
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, value, onChange, size = "md", ...props }, ref) => {
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

    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between border bg-[#161718] font-normal text-text-primary outline-none transition-all",
            size === "sm"
              ? "h-[32px] rounded-[10px] pl-3 pr-2 py-1 text-[13px]"
              : "h-[44px] rounded-[16px] pl-4 pr-2 py-2 text-[15px]",
            open ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-border hover:border-border-subtle",
            props.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={props.disabled}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <ChevronDown size={size === "sm" ? 14 : 18} className={cn("ml-2 shrink-0 transition-transform text-text-primary font-bold", open && "rotate-180")} strokeWidth={2.5} />
        </button>
        
        {open && !props.disabled && (
          <div className="absolute z-[100] mt-1.5 w-full min-w-[10rem] overflow-hidden rounded-[10px] border border-[#2a2a2a] bg-[#141414] shadow-2xl animate-in fade-in-0 zoom-in-95 py-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center px-3 py-2.5 text-left text-[13px] font-medium transition-colors outline-none",
                    isSelected
                      ? "bg-accent text-white"
                      : "text-text-primary hover:bg-[#1e1e1e]"
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
