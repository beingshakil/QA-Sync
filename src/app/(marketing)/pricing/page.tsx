import type { Metadata } from "next";
import { Cell, CtaBand, FaqList, PageHero, Section, SectionHead } from "@/components/marketing/sections";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { PLAN_MATRIX, PLANS } from "@/content/marketing";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, faqPage, graph, softwareApplication } from "@/components/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: Free and Pro Plans",
  description: "Start free with 2 projects and 50 comments. Pro is $5 a month for every review tool with no limits: projects, comments, audits, teammates and client guests.",
  path: "/pricing",
});

const PRICING_FAQ = [
  { q: "What happens when I reach a Free limit?", a: "Nothing is deleted. We warn you in the app and by email when you're close, and once a limit is reached you can keep working with what you have. To add more, upgrade to Pro or delete old work." },
  { q: "What's included in Free?", a: "Live element pins on 2 projects, 50 comments (pins and replies), 3 page audits and one teammate. Inspect, freeze hover, device sizes and split view, design overlay, page-wise QA tracking, guest comments and AI agents are on Pro." },
  { q: "What is a guest?", a: "Someone outside your workspace, such as a client, who opens a share link without creating an account. On Free, guests can view a shared review; on Pro they can pin, reply and sign off, with no limit on how many." },
  { q: "Can I cancel Pro?", a: "Any time. You drop back to Free and keep all your projects and comments. Above the Free limits you just can't add new ones until you upgrade again." },
  { q: "Is Pro really unlimited?", a: "Yes, for normal use: there's no cap on projects, comments, audits, teammates or client guests. Pro works under fair use, so if a single workspace's usage grows large enough to slow the service for everyone else (for example, automated bulk uploads), we'll get in touch to work it out before anything changes. Each file can be up to 15 MB." },
  { q: "Is $5 the whole price?", a: "Yes. No per-seat fees, no add-ons and no annual lock-in: $5 a month for everything QASync does, with no limits." },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={graph(softwareApplication(), faqPage(PRICING_FAQ, "/pricing"), breadcrumbs([{ name: "Pricing", path: "/pricing" }]))} />
      <PageHero
        eyebrow="Pricing"
        title="Start free."
        accent="Pro costs a coffee."
        sub="Free covers comment pins on 2 projects. Pro is $5 a month for every review tool, client guests and AI agents, with no limits."
      />
      <Section className="pt-12 md:pt-14">
        <PricingCards />
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHead eyebrow="Compare plans" title="Everything," accent="side by side." />
        <div data-reveal className="mx-auto mt-10 max-w-3xl overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-4" />
                {PLANS.map((p) => (
                  <th key={p.name} className="w-28 px-5 py-4 font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            {PLAN_MATRIX.map((g) => (
              <tbody key={g.group}>
                <tr>
                  <td colSpan={PLANS.length + 1} className="bg-surface-2 px-5 py-2.5 text-[12.5px] font-semibold text-ink-2">
                    {g.group}
                  </td>
                </tr>
                {g.rows.map(([label, ...vals]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-ink-2">{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-5 py-3">
                        <Cell v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHead eyebrow="FAQ" title="Pricing," accent="explained." />
        <FaqList items={PRICING_FAQ} />
      </Section>
      <CtaBand />
    </>
  );
}
