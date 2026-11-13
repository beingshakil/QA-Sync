import type { Metadata } from "next";
import { CtaBand, PageHero, Section } from "@/components/marketing/sections";
import { INTEGRATIONS } from "@/content/marketing";
import { IntegrationIcon } from "@/components/integration-icon";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Integrations"
        title="Feedback goes"
        accent="where work happens."
        sub="Two-way sync with your tracker, alerts where your team talks, and a review for every preview deploy. Integrations are on every paid plan, not just the top one."
      />
      <Section className="space-y-14">
        {INTEGRATIONS.map((g) => (
          <div key={g.group}>
            <h2 className="font-mono text-[12px] uppercase tracking-widest text-ink-3">{g.group}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((i) => (
                <div key={i.name} data-reveal data-spotlight className="lift flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink">
                    <IntegrationIcon name={i.name} size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {i.name}
                      {i.status && (
                        <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${i.status === "Beta" ? "bg-blue-soft text-blue" : "bg-surface-2 text-ink-3"}`}>
                          {i.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-3">{i.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
      <CtaBand />
    </>
  );
}
