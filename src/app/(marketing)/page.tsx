import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { CtaBand, FaqList, SectionHead, SpiderWeb, d } from "@/components/marketing/sections";
import { RotatingWord, ThreeViews, UrlStart } from "@/components/marketing/interactive";
import {
  AgentTerminal,
  AuditPreview,
  BentoCard,
  DevicesVisual,
  FreezeVisual,
  HowItWorks,
  PagesVisual,
  ProductShot,
  ShareVisual,
  SpecVisual,
  TRUST,
} from "@/components/marketing/home-visuals";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { IntegrationIcon } from "@/components/integration-icon";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/site";
import { FAQ } from "@/content/marketing";
import { JsonLd, faqPage, graph, organization, softwareApplication, website } from "@/components/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "QASync: Visual Website Feedback and QA Tool",
  absoluteTitle: true,
  description: "Pin visual feedback on any live website, inspect specs, run SEO audits and verify every fix. Free plan, nothing to install, and clients need no account.",
  path: "/",
});

const PLATFORMS = ["Webflow", "WordPress", "Shopify", "Framer", "Next.js", "Wix", "Squarespace", "React", "Ghost", "Vercel", "Netlify"];

/** One content column for the whole page; sections are separated by a rule on that column. */
function Block({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className={cn("border-t border-line py-20 md:py-32", className)}>{children}</div>
    </section>
  );
}

/** Three short points beside a visual: a title and one line each, on a thin rule. */
function Points({ items, children }: { items: [string, string][]; children?: ReactNode }) {
  return (
    <div>
      <ul className="space-y-8">
        {items.map(([t, b], i) => (
          <li key={t} data-reveal style={d(i * 100)} className="border-l border-line-strong pl-5">
            <h3 className="text-[17px] font-semibold tracking-[-0.012em] text-ink">{t}</h3>
            <p className="mt-2 text-pretty text-[14.5px] leading-[1.65] text-ink-2">{b}</p>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

/** Header across the top (same style as every section), then the visual and its points. */
function Feature({ head, visual, points, flip, children }: { head: ReactNode; visual: ReactNode; points: [string, string][]; flip?: boolean; children?: ReactNode }) {
  return (
    <>
      {head}
      <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-20">
        <div className={cn("lg:col-span-7", flip && "lg:order-2")}>{visual}</div>
        <div className={cn("lg:col-span-5", flip && "lg:order-1")}>
          <Points items={points}>{children}</Points>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={graph(organization(), website(), softwareApplication(), faqPage(FAQ, "/"))} />
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div className="site-glow" aria-hidden />
        <SpiderWeb />
        <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-24">
          {/* Centred hero: the original design, kept exactly */}
          <div className="text-center">
            <h1 data-reveal style={d(40)} className="mx-auto mt-4 max-w-5xl text-[44px] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[54px] md:text-[60px] lg:text-[76px] xl:text-[84px]">
              Visual feedback that <span className="text-gradient-sweep">gets</span> <RotatingWord />
            </h1>
            <p data-reveal style={d(180)} className="mx-auto mt-6 max-w-[38rem] text-lg leading-relaxed text-ink-2">
              Pin feedback on any live site, check the build against the design, give developers full context, and verify every fix before it&apos;s closed.
            </p>
            <div data-reveal style={d(280)} className="mt-9 flex justify-center">
              <UrlStart variant="gradient" />
            </div>
            <p data-reveal style={d(340)} className="mt-4 text-[13px] text-ink-3">
              Free forever plan · No install · Guests don&apos;t need an account
            </p>
          </div>

          <div className="mt-16 md:mt-20">
            <ProductShot />
          </div>

          <div data-reveal className="mt-16 flex flex-col gap-6 border-t border-line py-10 md:flex-row md:items-center md:justify-between md:gap-10">
            <p className="max-w-[18rem] shrink-0 text-[14px] leading-snug text-ink-3">Review any live site. No script to add, no extension to install.</p>
            {/* Endless loop: the list is rendered twice and the track slides by half its width */}
            <div className="marquee min-w-0 flex-1" aria-label="Works with sites built on these platforms">
              <ul className="marquee-track items-center gap-12 pr-12 text-ink-3">
                {[...PLATFORMS, ...PLATFORMS].map((n, k) => (
                  <li key={k} aria-hidden={k >= PLATFORMS.length} className="flex items-center gap-2 whitespace-nowrap text-[15px] font-medium transition-colors hover:text-ink">
                    <IntegrationIcon name={n} size={17} mono />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <Block id="how-it-works">
        <SectionHead
          title="Most feedback tools stop at “resolved”."
          accent="QASync stops at verified."
          sub="Every issue moves through four plain statuses, so the client, the designer and the developer always know what's left."
        />
        <HowItWorks />
      </Block>

      {/* ───────── One pin, three views ───────── */}
      <Block>
        <SectionHead title="The same issue," accent="written for whoever is reading it." />
        <div className="mt-16">
          <ThreeViews />
        </div>
      </Block>

      {/* ───────── Review canvas ───────── */}
      <Block>
        <SectionHead
          title="Say exactly what's wrong."
          accent="Once."
          sub="Everything a reviewer needs sits in one canvas over the live site, so nobody has to turn “it looks off” into a ticket."
        />
        <div className="mt-16 grid gap-4 md:grid-cols-6">
          <BentoCard
            className="md:col-span-4"
            title="Inspect and measure"
            body="Hover any element to read its font, size, padding, colour and contrast. Pin it and those specs travel with the comment."
            visual={<SpecVisual />}
          />
          <BentoCard className="md:col-span-2" delay={90} title="Freeze hover states" body="Press F to hold menus and tooltips still long enough to pin them." visual={<FreezeVisual />} />
          <BentoCard className="md:col-span-2" title="Every screen size" body="Desktop, tablet and phone presets, or two devices side by side with scrolling in sync." visual={<DevicesVisual />} />
          <BentoCard className="md:col-span-2" delay={90} title="Page-by-page QA" body="Each page carries a status, so anyone can see what's reviewed, in progress or signed off." visual={<PagesVisual />} />
          <BentoCard className="md:col-span-2" delay={180} title="Clients without logins" body="Share a link to the exact page. Guests comment with just their name." visual={<ShareVisual />} />
        </div>
      </Block>

      {/* ───────── SEO audit ───────── */}
      <Block>
        <Feature
          head={
            <SectionHead
              title="See your page the way Google does."
              accent="With the fix spelled out."
              sub="Titles, headings, links, images, schema and Open Graph each get a clear pass or fail."
            />
          }
          visual={<AuditPreview />}
          points={[
            ["12 clear checks", "On-page and technical: title, description, headings, images, links, URL, canonical, schema and more."],
            ["A fix for every red item", "Not just “failed”: each problem says exactly what to change."],
            ["Links you can trust", "Every link is tested, blocked and broken are told apart, and navbar and footer links can be left out."],
          ]}
        />
      </Block>

      {/* ───────── AI agents ───────── */}
      <Block>
        <Feature
          flip
          head={
            <SectionHead
              title="Let your agent take the first pass."
              accent="You decide what's done."
              sub="Connect Claude Code, Cursor or any MCP client, and it works through your open issues."
            />
          }
          visual={<AgentTerminal />}
          points={[
            ["Full context", "Every issue comes with its selector, element styles, browser and console errors."],
            ["Your tools", "Claude Code, Cursor, VS Code or any MCP client, connected with a token from Settings."],
            ["People sign off", "Agents can mark issues Fixed. Only a person can mark them Verified."],
          ]}
        >
          <div data-reveal style={d(300)} className="mt-9 pl-5">
            <ButtonLink href="/product/ai-agents" variant="secondary">
              How agents connect <ArrowRight size={15} />
            </ButtonLink>
          </div>
        </Feature>
      </Block>

      {/* ───────── Trust ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHead size="sm" title="Safe to send to clients." />
        </div>
        <ul className="grid gap-10 sm:grid-cols-3 lg:col-span-8 lg:gap-8">
          {TRUST.map(({ icon: Icon, t, b }, i) => (
            <li key={t} data-reveal style={d(i * 100)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2">
                <Icon size={17} />
              </span>
              <h3 className="mt-5 text-[16px] font-semibold text-ink">{t}</h3>
              <p className="mt-2 text-pretty text-[14.5px] leading-[1.65] text-ink-2">{b}</p>
            </li>
          ))}
        </ul>
      </Block>

      {/* ───────── Pricing ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHead size="sm" title="Start free." accent="Upgrade for the price of a coffee." sub="Free covers comment pins on 2 projects. Pro unlocks every tool, with no limits." />
          <Link data-reveal href="/pricing" className="-my-1.5 mt-5 inline-flex items-center gap-1.5 py-1.5 text-[14px] font-medium text-brand-ink underline-offset-4 hover:underline max-sm:min-h-11">
            Compare plans <ArrowRight size={14} />
          </Link>
        </div>
        <div className="lg:col-span-8">
          <PricingCards className="" />
        </div>
      </Block>

      {/* ───────── FAQ ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHead size="sm" title="Questions," accent="answered." />
          <p data-reveal className="mt-5 max-w-[18rem] text-[15px] leading-relaxed text-ink-3">
            Still unsure? Paste a URL above. The free plan takes ten seconds to try.
          </p>
        </div>
        <div className="lg:col-span-8">
          <FaqList className="" />
        </div>
      </Block>

      <CtaBand />
    </>
  );
}
