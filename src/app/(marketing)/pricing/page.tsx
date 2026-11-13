import type { Metadata } from "next";
import { Cell, CtaBand, FaqList, PageHero, Section, SectionHead } from "@/components/marketing/sections";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { PLAN_MATRIX, PLANS } from "@/content/marketing";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, faqPage, graph, softwareApplication } from "@/components/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: Free and Pro Plans",
  description: "QASync is free for 2 projects and 200 comments. Pro is $5 a month for 5 projects, unlimited comments and 3 client guests. Every review tool on both.",
  path: "/pricing",
});

const PRICING_FAQ = [
  { q: "What happens when I reach a Free limit?", a: "Nothing is deleted. You can keep working on what you have; to add a third project or go past 200 comments, upgrade to Pro or archive old work." },
  { q: "What is a guest?", a: "Someone outside your workspace, such as a client, who opens a share link and leaves comments without creating an account. Pro includes 3 guests." },
  { q: "Can I cancel Pro?", a: "Any time. You drop back to Free and keep your projects and comments. Anything above the Free limits becomes read-only until you upgrade again." },
  { q: "Is $5 the whole price?", a: "Yes. No per-seat fees, no add-ons and no annual lock-in: $5 a month for everything in Pro." },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={graph(softwareApplication(), faqPage(PRICING_FAQ, "/pricing"), breadcrumbs([{ name: "Pricing", path: "/pricing" }]))} />
      <PageHero
        eyebrow="Pricing"
        title="Every review tool, free."
        accent="Pro costs a coffee."
        sub="Both plans include every review tool and page audits. When you need more projects, unlimited comments or client guests, Pro is $5 a month."
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
                  <td colSpan={PLANS.length + 1} className="bg-surface-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">
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
