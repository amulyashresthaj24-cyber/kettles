/** Visible FAQ copy and the FAQPage structured data built from it. */

export const LANDING_FAQS: readonly [question: string, answer: string][] = [
  [
    "Is it task-linked or just a stopwatch?",
    "Task-linked. You pick a task first, and the time you brew is sealed to it. That's what makes your weekly report accurate enough to invoice without second-guessing.",
  ],
  [
    "Does the timer survive a tab close?",
    "Yes. Brews are saved to the cloud, so closing a tab, refreshing, or switching devices doesn't lose a second. Your timer keeps running where it left off.",
  ],
  [
    "Which platforms are supported?",
    "Kettles runs in the browser, plus native macOS and Windows apps with a floating always-on-top mini-timer. A browser extension keeps everything in sync.",
  ],
  [
    "Can I export for invoicing?",
    "Every weekly report exports to PDF or CSV in one click, with hours broken down per client, ready to attach to an invoice or send straight to a client.",
  ],
  [
    "Is my data private?",
    "Yes. Kettles never takes screenshots, logs keystrokes, or scores your productivity. It records the hours you choose to brew, and nothing else. Read the full Privacy Policy for details.",
  ],
  [
    "Why does Kettles request Google account data?",
    "Only to sign you in. If you use Sign in with Google, we request your basic profile (name and email) to create or open your Kettles account. We do not access Gmail, Drive, Contacts, or other Google services.",
  ],
];

export function landingFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQS.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}
