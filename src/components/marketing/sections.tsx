import { Check, Minus, MousePointer2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { FAQ } from "@/content/marketing";
import { cn } from "@/lib/utils";
import { UrlStart } from "./interactive";

/** Stagger helper for [data-reveal] children: style={d(120)} → 120ms delay. */
export const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28", className)}>
      {children}
    </section>
  );
}

export function SectionHead({ eyebrow, title, accent, sub, center }: { eyebrow?: string; title: string; accent?: string; sub?: string; center?: boolean }) {
  return (
    <div data-reveal className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink md:text-[44px]">
        {title} {accent && <span className="text-gradient">{accent}</span>}
      </h2>
      {sub && <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{sub}</p>}
    </div>
  );
}

/** Gradient hairline used between major sections. */
export function Divider() {
  return <div className="hairline-grad mx-auto max-w-6xl" aria-hidden />;
}

/* ── Hero product mock: the whole loop, told in 9 seconds ──
 * cursor clicks the CTA → pin drops → comment thread slides in → reply →
 * "Mark fixed" → pin turns green → "Verified" toast. Static final state with reduced motion. */
export function HeroMock() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl" data-reveal style={d(150)}>
      {/* soft brand glow under the mock */}
      <div className="absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[40px] bg-grad-soft blur-2xl" aria-hidden />
      <div className="story ring-grad glow-brand relative overflow-hidden rounded-2xl bg-surface">
        {/* toolbar */}
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </div>
          <div className="flex-1 truncate rounded-md border border-line bg-surface px-3 py-1 font-mono text-[11px] text-ink-3">northwind.coffee/</div>
          <div className="hidden gap-1 rounded-md border border-line bg-surface p-0.5 text-[11px] sm:flex">
            <span className="rounded px-2 py-0.5 text-ink-3">Browse</span>
            <span className="rounded bg-ink px-2 py-0.5 text-paper">Comment</span>
            <span className="rounded px-2 py-0.5 text-ink-3">Inspect</span>
          </div>
        </div>

        <div className="relative grid md:grid-cols-[1fr_300px]">
          {/* page being reviewed */}
          <div className="relative min-h-[340px] overflow-hidden bg-[#fbf6ef] p-8 text-[#2b1d14]" style={{ fontFamily: "Georgia, serif" }}>
            <div className="flex items-center justify-between font-sans text-[11px] text-[#5a4636]">
              <span className="font-bold" style={{ fontFamily: "Georgia, serif" }}>● Northwind</span>
              <span className="hidden gap-4 sm:flex">
                <span>Shop</span>
                <span>Subscriptions</span>
                <span>Our story</span>
              </span>
            </div>
            <div className="mt-10 max-w-[60%] text-[30px] font-bold leading-[1.05] md:text-[38px]">
              Coffee roasted <i className="text-[#b5562d]">this week</i>, at your door by Friday.
            </div>
            <div className="relative mt-6 inline-block">
              <div className="rounded-md bg-[#b5562d] px-4 py-2.5 font-sans text-[12px] font-bold text-white">Start a subscription</div>
              {/* hover outline + measurement, as the cursor arrives */}
              <div className="story-outline pointer-events-none absolute -inset-1 rounded-lg outline outline-[1.5px] outline-blue">
                <div className="absolute -bottom-6 left-0 right-0 flex items-center gap-1 font-mono text-[10px] text-blue">
                  <span className="h-px flex-1 bg-blue" />
                  213px
                  <span className="h-px flex-1 bg-blue" />
                </div>
              </div>
              {/* the pin */}
              <span className="story-pin absolute -right-4 -top-7 h-7 w-7 rounded-[14px_14px_14px_2px] font-sans text-xs font-semibold text-white shadow-2 ring-2 ring-white">
                <span className="story-pin-num">3</span>
                <span className="story-pin-check">✓</span>
              </span>
            </div>
            <div className="absolute bottom-6 right-6 top-20 hidden w-[32%] rounded-2xl sm:block" style={{ background: "radial-gradient(circle at 30% 30%,#d79b6a,#7a4a2a 60%,#3c2214)" }} />
            <span className="absolute bottom-10 left-10 flex h-7 w-7 items-center justify-center rounded-[14px_14px_14px_2px] bg-[#16a34a] font-sans text-xs font-semibold text-white shadow-2 ring-2 ring-white">
              ✓
            </span>
          </div>

          {/* thread panel */}
          <div className="story-thread hidden border-l border-line bg-surface p-4 text-[13px] md:block">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-ink-3">#3 · MEDIUM</span>
              <span className="story-status rounded-full border border-line px-2 py-0.5 text-[11px]">
                <span className="story-s-open">● Open</span>
                <span className="story-s-fixed text-blue">● Fixed</span>
                <span className="story-s-verified text-[#16a34a]">✓ Verified</span>
              </span>
            </div>
            <div className="mt-2 font-medium text-ink">Button colour doesn&apos;t match the design</div>
            <div className="mt-3 rounded-lg bg-surface-2 p-2.5 font-mono text-[11px] text-ink-2">
              bg <span className="text-accent-ink">#B5562D</span> → design <span className="text-ink">#C25E2E</span>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[11px] text-ink-3">Maya · just now</div>
                <div className="text-ink-2">Token is out of date, see the design file.</div>
              </div>
              <div className="story-reply">
                <div className="text-[11px] text-ink-3">Arjun (dev) · just now</div>
                <div className="text-ink-2">Updated the token. Deployed to staging.</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="rounded-md bg-ink px-2.5 py-1.5 text-[12px] text-paper">Mark fixed</span>
              <span className="rounded-md border border-line px-2.5 py-1.5 text-[12px] text-ink-2">Assign</span>
            </div>
          </div>

          {/* verified toast */}
          <div className="story-toast absolute bottom-4 left-1/2 -ml-[110px] flex w-[220px] items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] shadow-2 md:left-[calc(50%-150px)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-[11px] text-white">✓</span>
            <span className="text-ink">Fix verified on the live page</span>
          </div>

          {/* the cursor driving the story */}
          <MousePointer2 aria-hidden size={20} className="story-cursor fill-ink text-paper drop-shadow" />
        </div>
      </div>
    </div>
  );
}

/* ── Capture → Discuss → Fix → Verify: the line draws and steps light up in order ── */
export function LoopDiagram() {
  const steps = [
    { n: "01", t: "Capture", b: "Click the element. QASync records the selector, specs, viewport and console.", c: "var(--st-open)" },
    { n: "02", t: "Discuss", b: "Teammates and guests reply in real time. @mention to pull someone in.", c: "var(--accent)" },
    { n: "03", t: "Fix", b: "A developer or an AI agent ships the fix, with full context and no follow-ups.", c: "var(--brand)" },
    { n: "04", t: "Verify", b: "QASync re-checks the element. Verified, or reopened with evidence.", c: "var(--st-verified)" },
  ];
  return (
    <div data-reveal className="relative mt-14 grid gap-4 md:grid-cols-4">
      <div className="absolute left-0 right-0 top-[27px] hidden h-px bg-line md:block" />
      <div className="draw-x absolute left-0 right-0 top-[27px] hidden h-[2px] bg-grad-brand md:block" />
      {steps.map((s, i) => (
        <div key={s.n} className="relative">
          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface font-mono text-sm shadow-1">
            <span className="step-dot absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-paper" style={{ background: s.c, ...d(350 + i * 380) }} />
            {s.n}
          </div>
          <h3 className="mt-5 text-lg font-semibold">{s.t}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.b}</p>
        </div>
      ))}
    </div>
  );
}

export function FeatureGrid({ items, cols = 3 }: { items: { title: string; body: string; tag?: string; icon?: ReactNode }[]; cols?: 2 | 3 }) {
  return (
    <div className={cn("mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line", cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((f, i) => (
        <div key={f.title} data-spotlight data-reveal style={d((i % 3) * 90)} className="bg-surface p-6">
          <div className="flex items-center gap-2">
            {f.icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-grad-soft text-brand-ink">{f.icon}</span>
            )}
            <h3 className="font-semibold text-ink">{f.title}</h3>
            {f.tag && (
              <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", f.tag === "Beta" ? "bg-blue-soft text-blue" : "bg-surface-2 text-ink-3")}>
                {f.tag}
              </span>
            )}
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

export function PageHero({ eyebrow, title, accent, sub, children }: { eyebrow: string; title: string; accent: string; sub: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div className="site-glow" aria-hidden />
      <div className="dots absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 md:pt-28">
        <div data-reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h1 data-reveal style={d(80)} className="mt-4 max-w-3xl text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[64px]">
          {title} <span className="text-gradient">{accent}</span>
        </h1>
        <p data-reveal style={d(160)} className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          {sub}
        </p>
        {children && (
          <div data-reveal style={d(240)}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function CtaBand({ title = "Point at the problem.", accent = "Watch it get fixed." }: { title?: string; accent?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div data-reveal className="mesh-panel px-6 py-16 text-center text-white md:px-16">
        <div className="absolute inset-0 bg-[#05070d]/45" aria-hidden />
        <h2 className="relative text-[34px] font-semibold leading-tight tracking-[-0.025em] md:text-[48px]">
          {title} <span className="bg-gradient-to-r from-[#cfe0ff] to-[#ead9ff] bg-clip-text text-transparent">{accent}</span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-white/70">Paste a URL to start. Free forever for small sites, and no credit card.</p>
        <div className="relative mt-8 flex justify-center">
          <UrlStart />
        </div>
      </div>
    </section>
  );
}

export function FaqList({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return (
    <div data-reveal className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
            {f.q}
            <span className="font-mono text-ink-3 transition-transform duration-300 group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function Cell({ v, strong }: { v: string | boolean; strong?: boolean }) {
  if (v === true) return <Check size={18} className={strong ? "text-[var(--st-verified)]" : "text-ink-2"} aria-label="Yes" />;
  if (v === false) return <Minus size={18} className="text-line-strong" aria-label="No" />;
  return <span className={cn("text-[13px]", strong ? "font-medium text-ink" : "text-ink-2")}>{v}</span>;
}

export { ButtonLink };
