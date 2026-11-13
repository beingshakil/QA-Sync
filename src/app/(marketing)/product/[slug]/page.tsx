import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, graph } from "@/components/json-ld";
import { CtaBand, FeatureGrid, PageHero, Section, SectionHead } from "@/components/marketing/sections";
import { ButtonLink } from "@/components/ui";
import { PRODUCTS } from "@/content/marketing";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug);
  return p ? pageMetadata({ title: p.seoTitle, description: p.seoDescription, path: `/product/${p.slug}` }) : {};
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) notFound();
  const others = PRODUCTS.filter((x) => x.slug !== slug);

  return (
    <>
      <JsonLd data={graph(breadcrumbs([{ name: p.name, path: `/product/${p.slug}` }]))} />
      <PageHero eyebrow={p.eyebrow} title={p.headline} accent={p.accent} sub={p.sub}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/app" size="lg">
            Start reviewing
          </ButtonLink>
          <ButtonLink href="/pricing" variant="secondary" size="lg">
            See pricing
          </ButtonLink>
        </div>
        <div className="ring-grad mt-12 inline-flex items-baseline gap-3 rounded-2xl bg-surface px-5 py-4 shadow-1">
          <span className="text-gradient font-mono text-3xl font-semibold tracking-tight">{p.stat.value}</span>
          <span className="text-sm text-ink-2">{p.stat.label}</span>
        </div>
      </PageHero>

      <Section>
        <SectionHead eyebrow="What you get" title={`${p.name},`} accent="in detail." />
        <FeatureGrid items={p.features} />
      </Section>

      <div className="border-y border-line bg-surface">
        <Section>
          <SectionHead eyebrow="In three steps" title="How it" accent="works." />
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {p.steps.map((s, i) => (
              <li key={s.title} data-reveal style={{ "--d": i * 120 } as React.CSSProperties} className="lift rounded-2xl border border-line bg-paper p-6">
                <span className="font-mono text-sm text-accent-ink">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section>
        <SectionHead eyebrow="Keep exploring" title="The rest of" accent="the loop." />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => (
            <Link key={o.slug} href={`/product/${o.slug}`} data-spotlight className="lift group rounded-2xl border border-line bg-surface p-5 shadow-1 hover:border-line-strong">
              <div className="font-medium">{o.name}</div>
              <p className="mt-1 text-sm text-ink-3">{o.menuBlurb}</p>
              <span className="mt-3 inline-block text-sm text-accent-ink opacity-0 transition group-hover:opacity-100">Learn more →</span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
