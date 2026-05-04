interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--content-gap)" }}>
      {children}
    </div>
  );
}
