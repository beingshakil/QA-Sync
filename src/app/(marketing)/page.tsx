import Link from "next/link";
import {
  Bot,
  Code2,
  Crosshair,
  FileText,
  Gauge,
  Link2,
  Mic,
  Ruler,
  ShieldCheck,
  Smartphone,
  Snowflake,
  BadgeCheck,
} from "lucide-react";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { CtaBand, FaqList, FeatureGrid, HeroMock, LoopDiagram, Section, SectionHead, d } from "@/components/marketing/sections";
import { OverlayDemo, ThreeViews, UrlStart } from "@/components/marketing/interactive";
import { INTEGRATIONS, PLANS } from "@/content/marketing";
import { IntegrationIcon } from "@/components/integration-icon";

const FEATURES = [
  { icon: <Crosshair size={16} />, title: "Live element pins", body: "Anchored to the real DOM element, so they survive redeploys and screen sizes." },
  { icon: <Snowflake size={16} />, title: "Freeze hover", body: "Press F to hold menus, tooltips and hover states long enough to pin them." },
  { icon: <Ruler size={16} />, title: "Inspect & measure", body: "Font, size, weight, line height, padding and contrast, read from the element itself." },
  { icon: <Smartphone size={16} />, title: "Device preview", body: "Desktop, tablet, phone or any custom width. Pins remember their viewport." },
  { icon: <Code2 size={16} />, title: "Developer context", body: "Selector, browser, OS, pixel ratio and console errors on every pin." },
  { icon: <BadgeCheck size={16} />, title: "Fix verification", body: "Fixed isn't done. Verified is. QASync re-checks the element before closing the loop." },
  { icon: <Gauge size={16} />, title: "Page audit score", body: "Broken links, labels, alt text, SEO and font sprawl, scored out of 100." },
  { icon: <Link2 size={16} />, title: "Guest links", body: "Clients pin and reply with no account and nothing to install." },
  { icon: <Bot size={16} />, title: "AI agents (MCP)", body: "Claude, ChatGPT and Codex read issues, ship fixes and get them verified.", tag: "Soon" },
  { icon: <Mic size={16} />, title: "Voice notes", body: "Talk instead of typing, with an editable transcript.", tag: "Soon" },
  { icon: <FileText size={16} />, title: "Photo & PDF review", body: "Pin images and PDFs with the same tools.", tag: "Soon" },
  { icon: <ShieldCheck size={16} />, title: "Privacy by default", body: "Sensitive data is masked in the browser before anything is uploaded." },
];

const STACK = ["Figma", "Jira", "Linear", "GitHub", "Slack", "Vercel", "ClickUp", "Asana", "Notion", "Claude", "ChatGPT", "Webflow", "WordPress", "Netlify"];

export default function Home() {
  return (
    <>
      {/* ───────── Hero ───────── */}
      <div className="relative overflow-hidden">
        <div className="site-glow" aria-hidden />
        <div className="dots absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 md:pt-24">
          <h1 data-reveal style={d(40)} className="mx-auto mt-4 max-w-4xl text-[46px] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[64px] md:text-[84px]">
            Visual feedback that <span className="text-gradient-sweep">gets fixed.</span>
          </h1>
          <p data-reveal style={d(180)} className="mx-auto mt-6 max-w-[38rem] text-lg leading-relaxed text-ink-2">
            Pin feedback on any live site, check the build against the design, give developers full context, and verify every fix before it&apos;s closed.
          </p>
          <div data-reveal style={d(280)} className="mt-9 flex justify-center">
            <UrlStart />
          </div>
          <p data-reveal style={d(340)} className="mt-4 text-[13px] text-ink-3">Free forever plan · No install · Guests don&apos;t need an account</p>
          <HeroMock />
        </div>
      </div>

      {/* ───────── Works with ───────── */}
      <div className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-6 sm:px-6">
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-ink-3">Fits your stack</span>
          <div className="marquee min-w-0 flex-1" aria-label="Integrations">
            <div className="marquee-track gap-12 pr-12 text-[15px] font-medium text-ink-3">
              {[...STACK, ...STACK].map((n, k) => (
                <span key={k} aria-hidden={k >= STACK.length} className="inline-flex items-center gap-2 whitespace-nowrap transition-colors hover:text-ink">
                  <IntegrationIcon name={n} size={18} />
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ───────── Loop ───────── */}
      <Section>
        <SectionHead
          eyebrow="How it works"
          title="Other tools stop at “resolved”."
          accent="QASync checks."
          sub="Every feedback tool can collect comments. QASync takes each one through to a fix that has been checked, so nothing quietly reopens two sprints later."
        />
        <LoopDiagram />
      </Section>

      {/* ───────── Three views ───────── */}
      <div className="border-y border-line bg-surface-2/50">
        <Section>
          <SectionHead eyebrow="One pin, three views" title="The same issue," accent="read the way each person needs it." />
          <div className="mt-12">
            <ThreeViews />
          </div>
        </Section>
      </div>

      {/* ───────── Feature grid ───────── */}
      <Section>
        <SectionHead eyebrow="Everything a review needs" title="One tool, from first pin" accent="to verified fix." />
        <FeatureGrid items={FEATURES} />
        <div className="mt-8 flex gap-3">
          <ButtonLink href="/product/capture" variant="secondary">
            Explore the product
          </ButtonLink>
          <ButtonLink href="/app" variant="ghost">
            Start reviewing →
          </ButtonLink>
        </div>
      </Section>

      {/* ───────── Design QA spotlight ───────── */}
      <div className="border-y border-line bg-surface">
        <Section className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <SectionHead
              eyebrow="Design QA"
              title="Catch the drift"
              accent="your eyes miss."
              sub="Fade between the design and the build at the same width. Inspect any element and your note says 24px, not “a bit tight”."
            />
            <ul className="mt-6 space-y-2 text-[15px] text-ink-2">
              {["Type, spacing and colour specs on hover", "Contrast ratio with AA/AAA on every pin", "Figma-linked overlay and drift detection (soon)"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <OverlayDemo />
        </Section>
      </div>

      {/* ───────── AI agents ───────── */}
      <Section className="grid items-center gap-12 md:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHead
            eyebrow="AI agents"
            title="Your agent fixes it."
            accent="QASync proves it."
            sub="Connect Claude, ChatGPT, Codex or Cursor over MCP. Agents get selectors, specs and console output, and nothing counts as done until QASync has re-checked the page."
          />
          <ButtonLink href="/product/ai-agents" variant="secondary" className="mt-6">
            How agents work with QASync
          </ButtonLink>
        </div>
        <div data-reveal className="ring-grad glow-brand rounded-2xl bg-[#0b1024] p-5 font-mono text-[13px] leading-relaxed text-white">
          <div className="mb-3 flex items-center gap-2 text-[11px] text-white/50">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </span>
            <Bot size={14} className="ml-2" /> agent · qasync-mcp
          </div>
          <p data-reveal style={d(200)}>
            <span className="text-white/50">you ›</span> Fix the open issues on Northwind and verify them.
          </p>
          <p data-reveal style={d(700)} className="mt-3 text-white/60">→ get_open_comments(project: &quot;northwind&quot;) · 5 open</p>
          <p data-reveal style={d(1100)} className="text-white/60">→ get_repro_bundle(#1) · selector #hero-cta, bg #B5562D, design #C25E2E</p>
          <p data-reveal style={d(1500)} className="text-white/60">→ edited tokens.css, components/Newsletter.tsx · deployed preview</p>
          <p data-reveal style={d(1900)} className="text-white/60">→ verify_fix(#1, #3, #6)</p>
          <p data-reveal style={d(2500)} className="mt-3">
            <span className="text-[#4ade80]">✓ #1 verified</span> <span className="text-[#4ade80]">✓ #3 verified</span>{" "}
            <span className="text-[#cca9e0]">↺ #6 reopened: input still has no label</span>
          </p>
        </div>
      </Section>

      {/* ───────── Integrations ───────── */}
      <div className="border-y border-line bg-surface-2/50">
        <Section>
          <SectionHead eyebrow="Integrations" title="Feedback goes" accent="where your team works." sub="Two-way sync keeps status aligned, so nobody tracks the same issue twice." />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {INTEGRATIONS.flatMap((g) => g.items)
              .slice(0, 18)
              .map((i, k) => (
                <div
                  key={i.name}
                  data-reveal
                  data-spotlight
                  style={d((k % 6) * 60)}
                  className="lift flex h-16 items-center justify-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[14px] font-medium text-ink-2 shadow-1 hover:border-line-strong hover:text-ink"
                >
                  <IntegrationIcon name={i.name} size={20} />
                  <span className="truncate">{i.name}</span>
                </div>
              ))}
          </div>
          <Link href="/integrations" className="mt-6 inline-block text-sm font-medium text-accent-ink">
            See all integrations →
          </Link>
        </Section>
      </div>

      {/* ───────── Security ───────── */}
      <div className="border-y border-line bg-surface">
        <Section className="grid gap-8 py-16 md:grid-cols-4 md:py-20">
          <div data-reveal>
            <Eyebrow>Security</Eyebrow>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Built for regulated teams.</h3>
          </div>
          {[
            ["Sandboxed review", "Proxied pages run in an isolated sandbox with no access to your session."],
            ["Masked before upload", "Emails, card numbers and anything marked data-private never leave the browser."],
            ["Enterprise controls", "SSO, SCIM, audit log, EU/US data residency and bring-your-own storage."],
          ].map(([t, b], k) => (
            <div key={t} data-reveal style={d(k * 120)}>
              <div className="font-medium">{t}</div>
              <p className="mt-1.5 text-[15px] text-ink-2">{b}</p>
            </div>
          ))}
        </Section>
      </div>

      {/* ───────── Pricing preview ───────── */}
      <Section>
        <SectionHead eyebrow="Pricing" title="Start free." accent="Stay because it works." center />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.slice(0, 3).map((p, k) => (
            <div
              key={p.name}
              data-reveal
              style={d(k * 110)}
              className={`rounded-2xl border p-6 ${p.featured ? "ring-grad glow-brand border-transparent bg-[#0b1024] text-white" : "lift border-line bg-surface shadow-1"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-grad-brand px-2 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">
                ${p.price.annual}
                <span className={`text-sm font-normal ${p.featured ? "text-white/60" : "text-ink-3"}`}>/mo</span>
              </div>
              <p className={`mt-1 text-sm ${p.featured ? "text-white/70" : "text-ink-3"}`}>{p.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-medium text-accent-ink">
            Compare all plans →
          </Link>
        </div>
      </Section>

      {/* ───────── FAQ ───────── */}
      <Section className="pt-0 md:pt-0">
        <SectionHead eyebrow="FAQ" title="Questions," accent="answered." />
        <FaqList />
      </Section>

      <CtaBand />
    </>
  );
}
