import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { CtaBand, FaqList, SectionHead, SpiderWeb, d } from "@/components/marketing/sections";
import { OverlayDemo, ThreeViews, UrlStart } from "@/components/marketing/interactive";
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

const PLATFORMS = ["Webflow", "WordPress", "Shopify", "Framer", "Next.js", "Wix"];

/** One content column for the whole page; sections are separated by a rule on that column. */
function Block({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className={cn("border-t border-line py-24 md:py-32", className)}>{children}</div>
    </section>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul data-reveal style={d(120)} className="mt-8 space-y-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3 text-[15px] text-ink-2">
          <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line-strong text-brand-ink">
            <Check size={11} strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div className="site-glow" aria-hidden />
        <SpiderWeb />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-6 md:pt-24">
          {/* Centred hero: the original design, kept exactly */}
          <div className="text-center">
            <h1 data-reveal style={d(40)} className="mx-auto mt-4 max-w-4xl text-[46px] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[64px] md:text-[84px]">
              Visual feedback that <span className="text-gradient-sweep">gets fixed.</span>
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
            <p className="max-w-[18rem] text-[14px] leading-snug text-ink-3">Review any live site. No script to add, no extension to install.</p>
            <ul className="flex flex-wrap items-center gap-x-9 gap-y-4 text-ink-3">
              {PLATFORMS.map((n) => (
                <li key={n} className="flex items-center gap-2 text-[15px] font-medium">
                  <IntegrationIcon name={n} size={17} mono />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <Block id="how-it-works">
        <SectionHead
          eyebrow="How it works"
          title="Most feedback tools stop at “resolved”."
          accent="QASync stops at verified."
          sub="Every issue moves through four plain statuses, so the client, the designer and the developer always know what's left."
        />
        <HowItWorks />
      </Block>

      {/* ───────── One pin, three views ───────── */}
      <Block>
        <SectionHead eyebrow="One pin, three views" title="The same issue," accent="written for whoever is reading it." />
        <div className="mt-14">
          <ThreeViews />
        </div>
      </Block>

      {/* ───────── Review canvas ───────── */}
      <Block>
        <SectionHead
          eyebrow="The review canvas"
          title="Say exactly what's wrong."
          accent="Once."
          sub="Everything a reviewer needs sits in one canvas over the live site, so nobody has to turn “it looks off” into a ticket."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-6">
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

      {/* ───────── Design QA ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHead
            size="sm"
            eyebrow="Design QA"
            title="Lay the design over the build."
            accent="Drift has nowhere to hide."
            sub="Upload the approved design for a page and fade between it and the live build at the same width."
          />
          <Points items={["Overlay with opacity or difference blending", "Or compare side by side as you scroll", "One design per page and per device"]} />
        </div>
        <div className="lg:col-span-7">
          <OverlayDemo />
        </div>
      </Block>

      {/* ───────── SEO audit ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:order-2 lg:col-span-5">
          <SectionHead
            size="sm"
            eyebrow="SEO audit"
            title="See the page the way search engines do."
            accent="With the fix spelled out."
            sub="Titles, headings, links, images, schema and Open Graph each get a clear pass or fail, and every red item says what to change."
          />
          <Points items={["12 on-page and technical checks", "Every link tested, with blocked and broken told apart", "Navbar and footer links filtered out on demand"]} />
        </div>
        <div className="lg:order-1 lg:col-span-7">
          <AuditPreview />
        </div>
      </Block>

      {/* ───────── AI agents ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHead
            size="sm"
            eyebrow="AI agents"
            title="Let your agent take the first pass."
            accent="You still decide what's done."
            sub="Connect Claude Code, Cursor or any MCP client. The agent reads each issue with its selector, styles and console errors, ships the fix and marks it Fixed. Only a person can mark it Verified."
          />
          <div data-reveal style={d(120)} className="mt-8">
            <ButtonLink href="/product/ai-agents" variant="secondary">
              How agents connect <ArrowRight size={15} />
            </ButtonLink>
          </div>
        </div>
        <div className="lg:col-span-7">
          <AgentTerminal />
        </div>
      </Block>

      {/* ───────── Trust ───────── */}
      <Block className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHead size="sm" eyebrow="Built to share" title="Safe to send to clients." />
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
          <SectionHead size="sm" eyebrow="Pricing" title="Start free." accent="Upgrade for the price of a coffee." sub="Both plans include every review tool and page audits." />
          <Link data-reveal href="/pricing" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-ink hover:underline">
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
          <SectionHead size="sm" eyebrow="FAQ" title="Questions," accent="answered." />
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
