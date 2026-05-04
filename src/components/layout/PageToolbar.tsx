import { cn } from "@/lib/utils";

interface PageToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function PageToolbar({
  left,
  right,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        className
      )}
      style={{ gap: "var(--toolbar-gap)" }}
    >
      {left && <div className="flex items-center" style={{ gap: "var(--component-gap)" }}>
        {left}
      </div>}
      {right && <div className="ml-auto flex items-center" style={{ gap: "var(--component-gap)" }}>
        {right}
      </div>}
    </div>
  );
}
