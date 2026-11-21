import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, graph } from "@/components/json-ld";
import { CtaBand, PageHero, Section, SectionHead } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui";
import { SOLUTIONS } from "@/content/marketing";

type Props = { params: Promise<{ slug: string }> };

/** "For designers", "For QA teams": lower-case only the first letter so acronyms survive. */
const forLabel = (name: string) => `For ${name.replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase())}`;

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  return s ? pageMetadata({ title: s.seoTitle, description: s.seoDescription, path: `/solutions/${s.slug}` }) : {};
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  if (!s) notFound();

  return (
    <>
      <JsonLd data={graph(breadcrumbs([{ name: forLabel(s.name), path: `/solutions/${s.slug}` }]))} />
      <PageHero title={s.headline} accent={s.accent} sub={s.sub}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/app" size="lg">
            Start free
          </ButtonLink>
          <ButtonLink href="/product/capture" variant="secondary" size="lg">
            See how it works
          </ButtonLink>
        </div>
      </PageHero>

      <Section>
        <SectionHead title="The problems you have now," accent="solved." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {s.pains.map((p, i) => (
            <div key={p.title} data-reveal data-spotlight style={{ "--d": i * 120 } as React.CSSProperties} className="lift rounded-2xl border border-line bg-surface p-6 shadow-1">
              <div className="text-[13px] font-semibold text-ink-3">Before</div>
              <h3 className="mt-1 text-lg font-semibold line-through decoration-brand decoration-2">{p.title}</h3>
              <div className="mt-4 text-[13px] font-semibold text-[var(--st-verified)]">With QASync</div>
              <p className="mt-1 text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="border-y border-line bg-surface">
        <Section className="grid gap-12 md:grid-cols-2">
          <div>
            <SectionHead title="What you'll" accent="use every day." />
            <ul className="mt-6 space-y-3">
              {s.gains.map((g) => (
                <li key={g} className="flex items-center gap-3 text-[15px]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[11px] text-accent-ink">✓</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <figure data-reveal className="ring-grad self-center rounded-2xl bg-paper p-8">
            <blockquote className="text-[22px] font-medium leading-snug tracking-tight text-ink">“{s.quote.text}”</blockquote>
            <figcaption className="mt-4 text-[13.5px] font-medium text-ink-3">{s.quote.who}</figcaption>
          </figure>
        </Section>
      </div>

      <Section>
        <div className="flex flex-wrap gap-2">
          {SOLUTIONS.filter((x) => x.slug !== slug).map((o) => (
            <Link key={o.slug} href={`/solutions/${o.slug}`} className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink max-sm:min-h-11">
              {forLabel(o.name)} →
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
