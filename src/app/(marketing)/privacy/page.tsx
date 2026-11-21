import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, graph } from "@/components/json-ld";
import { PageHero } from "@/components/marketing/sections";
import { Contact, LegalDoc, LegalSection } from "@/components/marketing/legal";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "What QASync collects when you sign in with Google or review a site, why, who processes it, and how to get your data deleted.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={graph(breadcrumbs([{ name: "Privacy Policy", path: "/privacy" }]))} />
      <PageHero title="Privacy" accent="Policy." sub="What we collect, why we need it, and the choices you have. Written to be read, not skimmed past." />
      <LegalDoc updated="14 November 2026">
        <LegalSection n={1} title="Who we are">
          <p>
            QASync (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a visual feedback and website QA tool. This policy covers the QASync website and app. Questions or requests about your
            data: <Contact />.
          </p>
        </LegalSection>

        <LegalSection n={2} title="What we collect">
          <p>
            <strong>When you sign in with Google</strong>, Google shares your name, email address and profile picture with us. We never see or store your Google password,
            and signing in doesn&apos;t give us access to your Gmail, Drive or contacts.
          </p>
          <p>
            <strong>If you use the Google Drive features</strong> (exporting issues to Google Sheets, saving a report to Google Docs, or picking a design image from Drive),
            Google asks you first and then gives QASync access only to the files you pick and the files QASync creates for you, never the rest of your Drive. QASync keeps
            what it creates in a folder called &ldquo;QASync&rdquo; in your Drive. That access lives in your browser for about an hour and is not stored on our servers.
          </p>
          <p>
            <strong>If you connect Notion</strong>, Notion gives your workspace an access token covering only the pages you choose to share with QASync. We store it encrypted
            and use it only to create and update the issue rows you send there. Disconnect it at any time from a project&apos;s settings.
          </p>
          <p>We also keep:</p>
          <ul>
            <li>when you first signed in, when you last signed in, and how many times;</li>
            <li>the workspaces you belong to and your role in each;</li>
            <li>
              what you and your team create: projects (website addresses), comments, replies, screenshots, attachments, design images, page audits and API token
              names. API tokens themselves are stored only as a one-way hash.
            </li>
          </ul>
          <p>
            <strong>When a guest comments through a share link</strong>, we keep the name they type and their comments. Guests don&apos;t sign in and give us no email
            address.
          </p>
          <p>
            <strong>Technical details attached to comments:</strong> to help developers fix issues, each comment records the browser, operating system, screen size and
            recent console errors of the page being reviewed.
          </p>
        </LegalSection>

        <LegalSection n={3} title="Why we use it">
          <ul>
            <li>to sign you in and keep your session;</li>
            <li>to show your name and picture on your comments and to your teammates;</li>
            <li>to let workspace owners invite people by email and manage their team;</li>
            <li>to run, secure and improve QASync, for example by spotting abuse.</li>
          </ul>
          <p>
            We don&apos;t sell your data, we don&apos;t show ads, and we don&apos;t use your content to train AI models. If you connect an AI agent of your own through
            our MCP server, it reads only the workspace its token belongs to.
          </p>
        </LegalSection>

        <LegalSection n={4} title="Who can see your data">
          <p>
            Members of a workspace see that workspace&apos;s projects, comments and member list. People you send a share link to can see the one project it opens. No
            workspace can see another&apos;s data.
          </p>
          <p>We use these service providers to run QASync, and they process data only on our behalf:</p>
          <ul>
            <li>
              <strong>Vercel</strong>: hosting, and file storage for uploads;
            </li>
            <li>
              <strong>Neon</strong>: the database;
            </li>
            <li>
              <strong>Google</strong>: sign-in.
            </li>
          </ul>
          <p>Data is stored in the United States. We may disclose data if the law requires it.</p>
        </LegalSection>

        <LegalSection n={5} title="Cookies">
          <p>
            We use only the cookies the app needs to work: a sign-in session cookie, a cookie that remembers which workspace you have open, and security cookies used during
            Google sign-in. No advertising or third-party tracking cookies. The site may remember small display preferences (such as panel sizes) in your browser&apos;s
            local storage.
          </p>
        </LegalSection>

        <LegalSection n={6} title="How long we keep it">
          <p>
            We keep your account and workspace data while your account is active. Deleted projects, comments and audits are removed from the database straight away. When
            you ask us to delete your account, we delete your profile and the workspaces you own, along with their content, within 30 days.
          </p>
        </LegalSection>

        <LegalSection n={7} title="Your choices and rights">
          <ul>
            <li>change your display name in Settings at any time;</li>
            <li>leave a workspace by asking its owner, or remove members from a workspace you own;</li>
            <li>
              ask for a copy of your data, a correction, or deletion of your account by writing to <Contact />;
            </li>
            <li>
              remove QASync&apos;s access to your Google account at any time from your Google Account&apos;s{" "}
              <a href="https://myaccount.google.com/connections" className="font-medium text-brand-ink hover:underline" target="_blank" rel="noreferrer">
                third-party connections
              </a>{" "}
              page.
            </li>
          </ul>
          <p>Depending on where you live (for example in the EU, UK or California), you may have further rights; contact us and we&apos;ll help.</p>
        </LegalSection>

        <LegalSection n={8} title="Security">
          <p>
            Connections are encrypted (HTTPS). Sign-in sessions are signed, tokens are stored hashed, and every request is checked against the workspace it belongs to.
            Reviewed websites load in a sandbox with no access to your QASync session. No system is perfectly secure, so please tell us if you find a problem.
          </p>
        </LegalSection>

        <LegalSection n={9} title="Children">
          <p>QASync is a work tool and isn&apos;t meant for children under 16. We don&apos;t knowingly collect their data.</p>
        </LegalSection>

        <LegalSection n={10} title="Changes to this policy">
          <p>
            If we change this policy, we&apos;ll update the date at the top, and tell signed-in users about significant changes. See also our{" "}
            <Link href="/terms" className="font-medium text-brand-ink hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </LegalSection>
      </LegalDoc>
    </>
  );
}
