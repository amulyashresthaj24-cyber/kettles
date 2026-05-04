import { cn } from "@/lib/utils";

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        className
      )}
      style={{ gap: "var(--section-gap)" }}
    >
      {children}
    </div>
  );
}
