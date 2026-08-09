import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/marketing/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service — Kettles",
  description:
    "The terms that govern your use of Kettles, our task-linked time tracking product for focused work.",
  alternates: { canonical: "/legal/terms" },
};

const LAST_UPDATED = "2026-08-09";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and
          Kettles (&quot;Kettles,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing
          access to and use of the Kettles websites, web app, desktop apps, browser extension, and
          related services (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account, clicking to accept, or using the Service, you agree to these
          Terms and our{" "}
          <a href="/legal/privacy">Privacy Policy</a>. If you do not agree, do not use the Service.
        </p>
        <p>
          If you use the Service on behalf of an organization, you represent that you have
          authority to bind that organization, and &quot;you&quot; includes that organization.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "The Service",
    body: (
      <>
        <p>
          Kettles provides task-linked time tracking, project and client organization, focus/timer
          tools, reporting, optional public report sharing, and related productivity features. We
          may add, change, or discontinue features from time to time.
        </p>
        <p>
          The Service is offered on free and/or paid plans as described on our pricing or in-product
          billing pages. Feature availability may differ by plan, platform (web, desktop,
          extension), or region.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    body: (
      <>
        <p>To use most features you must create an account and provide accurate information. You agree to:</p>
        <ul>
          <li>Be at least 16 years old (or the age of digital consent in your jurisdiction)</li>
          <li>Keep your login credentials confidential and not share your account</li>
          <li>Notify us promptly of any unauthorized use of your account</li>
          <li>Accept responsibility for activity that occurs under your account</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms, create risk for other
          users, or are used for abusive or unlawful purposes.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You retain ownership of the content you submit to the Service, including clients,
          projects, tasks, notes, time entries, settings, and reports (&quot;Your Content&quot;).
        </p>
        <p>
          You grant Kettles a worldwide, non-exclusive, royalty-free license to host, store,
          process, transmit, display, and back up Your Content solely as needed to provide and
          improve the Service (for example syncing across your devices, generating reports you
          request, and delivering shared report links you create).
        </p>
        <p>You represent that you have the rights needed to submit Your Content and that it does not violate law or third-party rights. You are solely responsible for Your Content and for decisions you make based on reports or exports from the Service.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and public links",
    body: (
      <>
        <p>
          Some features let you share reports or other information via links. You control who
          receives those links and any optional password or expiry settings. Content you make
          available through a share link may be accessible to anyone who has the link until you
          revoke it or it expires.
        </p>
        <p>
          You are responsible for choosing what to share and for communicating appropriately with
          recipients. Do not share confidential client information unless you have the right to do
          so.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful, harmful, or fraudulent purpose</li>
          <li>Attempt to gain unauthorized access to other accounts, systems, or data</li>
          <li>Interfere with or disrupt the Service, including via malware, scraping at abusive rates, or denial-of-service attacks</li>
          <li>Reverse engineer the Service except where applicable law prohibits this restriction</li>
          <li>Resell, sublicense, or provide the Service to third parties except as we expressly allow</li>
          <li>Misrepresent your identity or affiliation</li>
          <li>Upload content that is illegal, infringing, or that you do not have rights to use</li>
        </ul>
      </>
    ),
  },
  {
    id: "plans-billing",
    title: "Plans, trials, and billing",
    body: (
      <>
        <p>
          If you purchase a paid plan, you agree to pay the fees described at purchase, plus
          applicable taxes. Unless stated otherwise, subscriptions renew automatically until
          canceled, and fees are non-refundable except where required by law or expressly stated
          by us.
        </p>
        <p>
          We may change prices with reasonable notice. Free tiers and trials may be modified or
          ended at any time. Failure to pay may result in suspension or downgrade of paid
          features.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Our intellectual property",
    body: (
      <>
        <p>
          The Service, including software, design, branding, documentation, and the Kettles name
          and marks, is owned by Kettles or its licensors and is protected by intellectual
          property laws. These Terms do not grant you any rights to our trademarks or brand
          assets except as needed to use the Service.
        </p>
        <p>
          Feedback you send us may be used freely to improve the product without obligation to
          you.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: (
      <p>
        The Service may integrate with or rely on third-party infrastructure (for example
        authentication, database hosting, or app distribution platforms). Your use of those
        services may be subject to their own terms. We are not responsible for third-party
        services we do not control.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, error-free, or that time
          records, billable totals, or exports will be free of defects. You are responsible for
          verifying reports before invoicing clients or making business decisions.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, KETTLES AND ITS AFFILIATES, OFFICERS,
          EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR
          GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE OR THESE
          TERMS WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE
          TWELVE (12) MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (US $100) IF YOU
          HAVE NOT PAID US.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases our liability is
          limited to the fullest extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: (
      <p>
        You agree to defend, indemnify, and hold harmless Kettles and its affiliates from and
        against any claims, damages, losses, and expenses (including reasonable legal fees)
        arising from Your Content, your use of the Service, your shared links, or your violation
        of these Terms or applicable law.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <>
        <p>
          You may stop using the Service at any time and may request account deletion as described
          in our Privacy Policy. We may suspend or terminate access if you breach these Terms, if
          required by law, or if we discontinue the Service.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Provisions that by their nature
          should survive (including ownership, disclaimers, limitations of liability, and
          indemnity) will survive.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to the Service or Terms",
    body: (
      <p>
        We may update these Terms from time to time. We will post the revised Terms with an
        updated &quot;Last updated&quot; date. Material changes may also be communicated in-app
        or by email. If you continue using the Service after changes take effect, you accept the
        revised Terms. If you do not agree, you must stop using the Service.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Delaware, USA, without regard to
        conflict-of-law rules, unless mandatory consumer protection laws in your country of
        residence require otherwise. Courts in Delaware will have exclusive jurisdiction over
        disputes, subject to those mandatory rights.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          These Terms are the entire agreement between you and Kettles regarding the Service and
          supersede prior agreements on the same subject. If any provision is unenforceable, the
          remaining provisions remain in effect. Our failure to enforce a provision is not a
          waiver. You may not assign these Terms without our consent; we may assign them in
          connection with a merger, acquisition, or sale of assets.
        </p>
        <p>
          For questions about these Terms, contact{" "}
          <a href="mailto:legal@kettles.app">legal@kettles.app</a>.
        </p>
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="The rules that govern your use of Kettles — accounts, content, sharing, and acceptable use."
      lastUpdated={LAST_UPDATED}
      sections={sections}
      relatedHref="/legal/privacy"
      relatedLabel="Privacy Policy"
    />
  );
}
