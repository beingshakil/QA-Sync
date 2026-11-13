import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, graph } from "@/components/json-ld";
import { PageHero } from "@/components/marketing/sections";
import { Contact, LegalDoc, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: "The terms for using QASync: your account, your content, acceptable use, plans, and the limits of our responsibility.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd data={graph(breadcrumbs([{ name: "Terms of Service", path: "/terms" }]))} />
      <PageHero eyebrow="Legal" title="Terms of" accent="Service." sub="The agreement between you and QASync when you use the website and the app." />
      <LegalDoc updated="14 November 2026">
        <LegalSection n={1} title="Agreeing to these terms">
          <p>
            By signing in to or using QASync you agree to these terms and to our{" "}
            <Link href="/privacy" className="font-medium text-brand-ink hover:underline">
              Privacy Policy
            </Link>
            . If you use QASync for an organisation, you confirm you can accept these terms for it.
          </p>
        </LegalSection>

        <LegalSection n={2} title="Your account">
          <p>
            You sign in with a Google account and are responsible for what happens under it. Workspace owners decide who joins their workspace and can remove members. Keep
            share links and API tokens private: anyone who has them can do what they allow.
          </p>
        </LegalSection>

        <LegalSection n={3} title="Your content">
          <p>
            You own what you and your team put into QASync: comments, screenshots, attachments, designs and the rest. You give us permission to store, process and display
            it only as needed to run the service for you. You confirm you have the right to upload it and to review the websites you add.
          </p>
        </LegalSection>

        <LegalSection n={4} title="Acceptable use">
          <p>Don&apos;t use QASync to:</p>
          <ul>
            <li>review or load websites you aren&apos;t allowed to access, or try to get around another site&apos;s protections;</li>
            <li>upload anything illegal, harmful, or that infringes someone else&apos;s rights;</li>
            <li>probe, overload or attack QASync, other users or the sites loaded through it;</li>
            <li>use the site preview as a general proxy, or to disguise where traffic comes from.</li>
          </ul>
          <p>We may suspend accounts or remove content that breaks these rules.</p>
        </LegalSection>

        <LegalSection n={5} title="Plans and payment">
          <p>
            QASync has a free plan and paid plans, described on the{" "}
            <Link href="/pricing" className="font-medium text-brand-ink hover:underline">
              pricing page
            </Link>
            . Paid plans renew until you cancel; cancelling stops future charges and your workspace moves to the free plan. We&apos;ll give notice before changing prices
            for existing subscriptions.
          </p>
          <p>
            <strong>Fair use.</strong> &ldquo;Unlimited&rdquo; on the Pro plan means no fixed cap for normal use by a team. To keep QASync fast for everyone, we may contact
            you about, and if needed limit, usage that is far beyond normal and strains the service (for example automated bulk uploads or scripted traffic). We&apos;ll
            always reach out before limiting a paying workspace.
          </p>
        </LegalSection>

        <LegalSection n={6} title="The service">
          <p>
            We work hard to keep QASync running and your data safe, but the service is provided &ldquo;as is&rdquo;, without guarantees that it will always be available or
            free of errors. Features may change. Audit results and AI suggestions are aids, not guarantees; check important changes yourself.
          </p>
        </LegalSection>

        <LegalSection n={7} title="Limits of liability">
          <p>
            To the extent the law allows, QASync isn&apos;t liable for indirect or consequential losses, lost profits or lost data, and our total liability for any claim is
            limited to what you paid us in the 12 months before it. Nothing here limits liability that can&apos;t legally be limited.
          </p>
        </LegalSection>

        <LegalSection n={8} title="Ending the agreement">
          <p>
            You can stop using QASync at any time and ask us to delete your account. We may end or suspend access for serious or repeated breaches of these terms. Sections
            that by their nature should survive (such as content ownership and liability) continue after the agreement ends.
          </p>
        </LegalSection>

        <LegalSection n={9} title="Changes and contact">
          <p>
            We may update these terms; the date at the top shows the latest version, and we&apos;ll tell signed-in users about significant changes. Questions: <Contact />.
          </p>
        </LegalSection>
      </LegalDoc>
    </>
  );
}
