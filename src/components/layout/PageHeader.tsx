interface PageHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header
      className="flex items-center justify-between"
      style={{ gap: "var(--header-gap)" }}
    >
      <div className="flex flex-col" style={{ gap: "4px" }}>
        <h1
          className="font-semibold text-text-primary"
          style={{
            fontSize: "var(--heading-xl-size)",
            fontWeight: "var(--heading-xl-weight)",
            lineHeight: "var(--heading-xl-line-height)",
            letterSpacing: "var(--heading-xl-letter-spacing)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-text-muted"
            style={{
              fontSize: "var(--body-sm-size)",
              fontWeight: "var(--body-sm-weight)",
              lineHeight: "var(--body-sm-line-height)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
