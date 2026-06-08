// Marketing route group — public, chrome-less pages (landing, future
// pricing/blog/etc). These bypass the app shell (sidebar, auth guard); see
// AppShell.tsx where the marketing paths are detected.

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
