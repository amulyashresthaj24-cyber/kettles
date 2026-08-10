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
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const listboxId = React.useId();

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

    // Prefer an exact match. Never silently fall back to options[0] when a
    // non-empty value is set but missing from the list — that made edit
    // dialogs show "Select task…" while a real taskId was already bound.
    const selectedOption =
      options.find((o) => o.value === value) ??
      (value ? { value, label: "Selected item" } : options[0]);

    const selectedIndex = options.findIndex((o) => o.value === value);
    const [activeIndex, setActiveIndex] = React.useState(selectedIndex < 0 ? 0 : selectedIndex);

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

    // Open onto the current selection, and keep the active option in view.
    React.useEffect(() => {
      if (!open) return;
      setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex);
    }, [open, selectedIndex]);

    React.useEffect(() => {
      if (!open) return;
      listRef.current
        ?.querySelector(`[data-index="${activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, [open, activeIndex]);

    const commit = (index: number) => {
      const opt = options[index];
      if (!opt) return;
      onChange?.({ target: { value: opt.value } });
      setOpen(false);
      triggerRef.current?.focus();
    };

    // Arrow / Home / End / Enter / Escape. This is a custom listbox rendered
    // from buttons, so none of it comes for free the way it would on <select>.
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (props.disabled) return;

      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          e.preventDefault();
          setActiveIndex(options.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          commit(activeIndex);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    };

    const isPill = variant === "pill";

    return (
      <div className={cn("relative", className)} ref={containerRef} onKeyDown={handleKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center justify-between font-normal select-none focus-ring",
            "transition-[border-color,background,box-shadow] duration-fast ease-out-soft",
            !isPill && "w-full bg-surface-mid text-text-primary rounded-control",
            isPill && "gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-mid text-[12px] font-medium text-text-secondary",
            !isPill && size === "sm" && "h-9 px-3 text-[13px]",
            !isPill && size === "md" && "h-9 px-3 text-[14px]",
            !isPill && size === "lg" && "h-10 px-4 text-[15px]",
            !isPill && "hover:bg-surface-raised",
            props.disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={props.disabled}
        >
          <span className={cn("truncate", isPill && "max-w-[120px]")}>{selectedOption?.label}</span>
          <CaretDown
            size={isPill ? 11 : (size === "sm" ? 14 : 16)}
            className={cn(
              "shrink-0 transition-transform duration-fast",
              isPill ? "text-text-faint" : "text-text-muted",
              open && "rotate-180"
            )}
            weight="regular"
          />
        </button>

        {open && !props.disabled && (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-activedescendant={`${listboxId}-${activeIndex}`}
            className={cn(
              "absolute z-dropdown w-full overflow-y-auto max-h-64 bg-surface-raised shadow-elevation-2 animate-dropdown-in",
              isPill ? "bottom-full mb-2 rounded-lg py-1 min-w-[160px]" : "top-full mt-1 rounded-xl py-1"
            )}
          >
            {options.map((opt, index) => {
              const isSelected = opt.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={opt.value}
                  id={`${listboxId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  type="button"
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-left text-sm transition-colors duration-fast outline-none",
                    isSelected
                      ? "bg-accent text-white font-medium"
                      : isActive
                      ? "bg-surface-mid text-text-primary"
                      : "text-text-primary hover:bg-surface-mid"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(index)}
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
