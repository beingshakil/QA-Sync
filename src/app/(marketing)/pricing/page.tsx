import type { Metadata } from "next";
import { Cell, CtaBand, FaqList, PageHero, Section, SectionHead } from "@/components/marketing/sections";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { PLAN_MATRIX, PLANS } from "@/content/marketing";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Every review tool, free."
        accent="Pay for scale."
        sub="Unlimited comments on every plan, including Free. Try Pro for 14 days with no card, then keep it or drop back to Free."
      />
      <Section className="pt-12 md:pt-14">
        <PricingCards />
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHead eyebrow="Compare plans" title="Everything," accent="side by side." />
        <div data-reveal className="mt-10 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-4" />
                {PLANS.map((p) => (
                  <th key={p.name} className="px-5 py-4 font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            {PLAN_MATRIX.map((g) => (
              <tbody key={g.group}>
                <tr>
                  <td colSpan={5} className="bg-surface-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">
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
        <FaqList
          items={[
            { q: "What happens when the Pro trial ends?", a: "You drop back to Free automatically, with no surprise charges. Your projects and issues stay. Projects beyond the Free limit become read-only until you upgrade." },
            { q: "Do guests count as members?", a: "No. Clients and stakeholders who comment through a share link are free and unlimited on every plan." },
            { q: "Can I pay per project instead of per seat?", a: "Plans are priced per workspace with a member allowance, so agencies aren't charged for every client project." },
            { q: "Do you offer discounts?", a: "Yes: 20% off annual plans, and 50% off for non-profits and education." },
          ]}
        />
      </Section>
      <CtaBand />
    </>
  );
}
