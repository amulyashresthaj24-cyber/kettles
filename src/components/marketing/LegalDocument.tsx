import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
  /** Path of the other legal doc for cross-link (e.g. /legal/terms) */
  relatedHref: string;
  relatedLabel: string;
};

export function LegalDocument({
  title,
  description,
  lastUpdated,
  sections,
  relatedHref,
  relatedLabel,
}: LegalDocumentProps) {
  return (
    <div className="kettles min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--k-hairline)] bg-[var(--k-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Kettles home">
            <Image
              src="/images/kettleslong.svg"
              alt="Kettles"
              width={120}
              height={32}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-[13px] font-medium text-[var(--k-muted)]">
            <Link href="/legal/privacy" className="transition hover:text-[var(--k-ink)]">
              Privacy
            </Link>
            <Link href="/legal/terms" className="transition hover:text-[var(--k-ink)]">
              Terms
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-[var(--k-accent)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[var(--k-accent-h)]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--k-muted)]">
          Legal
        </p>
        <h1 className="text-[32px] font-bold tracking-[-0.03em] text-[var(--k-ink)] md:text-[40px]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[var(--k-muted)]">
          {description}
        </p>
        <p className="mt-4 text-[13px] text-[var(--k-faint)]">
          Last updated: <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
        </p>

        <nav
          aria-label="On this page"
          className="mt-10 rounded-2xl border border-[var(--k-hairline)] bg-[var(--k-surface)]/60 p-5"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--k-muted)]">
            On this page
          </p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-[13.5px] font-medium text-[var(--k-ink2)] transition hover:text-[var(--k-accent2)]"
                >
                  <span className="mr-1.5 text-[var(--k-faint)]">{i + 1}.</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.02em] text-[var(--k-ink)]">
                {section.title}
              </h2>
              <div className="space-y-3 text-[15px] leading-[1.7] text-[var(--k-ink2)] [&_a]:text-[var(--k-accent2)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[var(--k-steam)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-[var(--k-ink)] [&_ul]:space-y-1.5">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 border-t border-[var(--k-hairline)] pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[var(--k-faint)]">
              Questions?{" "}
              <a
                href="mailto:privacy@kettles.app"
                className="text-[var(--k-muted)] transition hover:text-[var(--k-ink)]"
              >
                privacy@kettles.app
              </a>
            </p>
            <div className="flex flex-wrap gap-4 text-[13px] font-medium text-[var(--k-faint)]">
              <Link href={relatedHref} className="transition hover:text-[var(--k-ink)]">
                {relatedLabel}
              </Link>
              <Link href="/" className="transition hover:text-[var(--k-ink)]">
                Back to home
              </Link>
            </div>
          </div>
          <p className="mt-6 text-[12.5px] text-[var(--k-faint)]">
            © {new Date().getFullYear()} Kettles. Made for focused work.
          </p>
        </footer>
      </main>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
