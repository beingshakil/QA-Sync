"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, Copy, LayoutList, Link2, Lock, MonitorSmartphone, MousePointer2, Ruler, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spec, Swatch } from "./spec";

/* ───────── "Say exactly what's wrong": the review canvas, step by step ─────────
 * Desktop: five steps on a timeline on the left, a sticky stage on the right.
 * The step that crosses the middle of the viewport becomes active: its icon
 * lights up, the timeline fills to it, and the stage cross-fades to its mockup,
 * which then plays (cursor lands, F presses, screens scroll together...).
 * Mobile: each step carries its own mockup under the text, shown in its final state.
 * Every mockup is a real screenshot of this site (public/showcase) in a device frame.
 * With reduced motion nothing animates (.bento-anim).
 */

const STEPS = [
  {
    icon: Ruler,
    t: "Inspect and measure",
    b: "Hover any element to read its font, size, padding, colour and contrast. Pin it and those specs travel with the comment.",
    Visual: InspectVisual,
  },
  {
    icon: Snowflake,
    t: "Freeze hover states",
    b: "Press F to hold menus and tooltips still long enough to pin them.",
    Visual: FreezeVisual,
  },
  {
    icon: MonitorSmartphone,
    t: "Every screen size",
    b: "Desktop, tablet and phone presets, or two devices side by side with scrolling in sync.",
    Visual: DevicesVisual,
  },
  {
    icon: Link2,
    t: "Clients without logins",
    b: "Share a link to the exact page. Guests comment with just their name.",
    Visual: ShareVisual,
  },
  {
    icon: LayoutList,
    t: "Page-by-page QA",
    b: "Each page carries a status, so anyone can see what's reviewed, in progress or signed off.",
    Visual: PagesVisual,
  },
] as const;

/** Height of each step on desktop; the timeline runs from the first icon to the last. */
const STEP_H = "36vh";

export function CanvasSteps() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // a step is active while it crosses the middle tenth of the viewport
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  function goTo(i: number) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    items.current[i]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  return (
    <div className="mt-12 lg:grid lg:grid-cols-[1fr_1.12fr] lg:gap-16">
      {/* desktop: the sticky stage, on the right */}
      <div className="hidden lg:order-2 lg:block">
        <div data-reveal className="sticky top-[max(5.5rem,calc(50vh-17rem))]">
          <Stage className="h-[34rem]">
            {STEPS.map(({ t, Visual }, i) => (
              <Layer key={t} on={i === active}>
                <Visual />
              </Layer>
            ))}
          </Stage>
        </div>
      </div>

      {/* the steps */}
      <ol className="relative">
        {/* timeline (desktop): a hairline from the first icon to the last, filled up to the active step */}
        <span aria-hidden className="absolute left-[27px] top-7 hidden w-px bg-line-strong lg:block" style={{ bottom: `calc(${STEP_H} - 28px)` }}>
          <span
            className="bento-anim absolute inset-0 origin-top bg-brand-ink transition-transform duration-700 [transition-timing-function:var(--ease-smooth)]"
            style={{ transform: `scaleY(${active / (STEPS.length - 1)})` }}
          />
        </span>

        {STEPS.map(({ icon: Icon, t, b, Visual }, i) => {
          const on = i === active;
          return (
            <li
              key={t}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-i={i}
              className="relative pb-16 last:pb-0 lg:pb-0"
            >
              <div className="lg:min-h-[36vh]">
                <div className="flex gap-5 sm:gap-6">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Step ${i + 1}: ${t}`}
                    aria-current={on ? "step" : undefined}
                    className={cn(
                      "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-500",
                      "border-transparent bg-brand text-white shadow-[0_0_0_6px_var(--paper),0_10px_30px_-8px_color-mix(in_srgb,var(--brand)_70%,transparent)]",
                      !on && "lg:border-line-strong lg:bg-paper lg:text-ink-3 lg:shadow-[0_0_0_6px_var(--paper)] lg:hover:text-ink-2",
                    )}
                  >
                    <Icon size={22} strokeWidth={1.75} />
                  </button>
                  <div className="min-w-0 pt-1">
                    <div className={cn("font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-500", on ? "text-brand-ink" : "text-brand-ink lg:text-ink-3")}>
                      Step 0{i + 1}
                    </div>
                    <h3
                      className={cn(
                        "mt-2 text-balance text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] transition-colors duration-500 md:text-[32px]",
                        on ? "text-ink" : "text-ink lg:text-ink-3",
                      )}
                    >
                      {t}
                    </h3>
                    <p className={cn("mt-3 max-w-[30rem] text-pretty text-[16px] leading-[1.65] transition-colors duration-500", on ? "text-ink-2" : "text-ink-2 lg:text-ink-3")}>{b}</p>
                  </div>
                </div>

                {/* mobile / tablet: the mockup under its step */}
                <div className="mt-6 lg:hidden">
                  <Stage className="min-h-[280px]">
                    <Layer on>
                      <Visual />
                    </Layer>
                  </Stage>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────── stage and layers ───────── */

function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative isolate grid place-items-center overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7", className)}>
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 -z-10 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-72 w-72 rounded-full bg-accent/12 blur-3xl" />
      <span aria-hidden className="hiw-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />
      {children}
    </div>
  );
}

/** One mockup on the stage. All layers share a grid cell and cross-fade; the active one is the `v` group its animations key off. */
function Layer({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div
      data-on={on}
      aria-hidden={!on}
      inert={!on}
      className={cn(
        "group/v bento-anim flex w-full items-center justify-center [grid-area:1/1] transition-[opacity,transform,filter] duration-700 [transition-timing-function:var(--ease-smooth)]",
        on ? "opacity-100" : "pointer-events-none scale-[0.97] opacity-0 blur-[3px]",
      )}
    >
      {children}
    </div>
  );
}

/* ───────── device mockups ───────── */

function BrowserFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2", className)}>
      <div className="flex h-7 items-center gap-2 border-b border-line bg-surface-2/70 px-2.5">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
        </span>
        <span className="mx-auto flex h-[18px] min-w-0 max-w-[70%] items-center gap-1 rounded-md bg-paper px-2 text-[10px] text-ink-3">
          <Lock size={8} className="shrink-0" />
          <span className="truncate">{url}</span>
        </span>
        <span className="w-7" aria-hidden />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function TabletFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[18px] bg-paper p-[5px] shadow-2 ring-1 ring-line-strong", className)}>
      <div className="relative overflow-hidden rounded-[13px]">{children}</div>
    </div>
  );
}

function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[22px] bg-paper p-[4px] shadow-2 ring-1 ring-line-strong", className)}>
      <div className="relative overflow-hidden rounded-[18px]">
        {children}
        {/* camera island, on the screen like a real phone */}
        <span aria-hidden className="absolute left-1/2 top-[4px] z-10 h-[7px] w-[36%] -translate-x-1/2 rounded-full bg-paper" />
      </div>
    </div>
  );
}

/* ───────── Inspect and measure ───────── */

function InspectVisual() {
  return (
    <div className="relative w-full max-w-[600px]">
      <BrowserFrame url="qasync.app" className="w-full">
        <Image src="/showcase/inspect-hero.webp" alt="QASync's own hero with its Start reviewing button being inspected" width={820} height={260} sizes="(min-width: 1024px) 600px, 90vw" className="block h-auto w-full" />
        {/* the hovered element: dashed outline, size labels, the cursor that lands on it */}
        <div aria-hidden className="pointer-events-none absolute" style={{ left: "64.5%", top: "52.7%", width: "21%", height: "16.9%" }}>
          <span className="absolute -inset-[3px] rounded-[10px] border-[1.5px] border-dashed border-brand-ink" />
          <span className="absolute -inset-[3px] rounded-[10px] bg-brand-ink/10" />
          <span className="absolute -bottom-[18px] left-0 right-0 flex items-center gap-1 text-[10px] font-semibold tabular-nums text-brand-ink">
            <span className="h-px flex-1 bg-brand-ink/70" />
            172
            <span className="h-px flex-1 bg-brand-ink/70" />
          </span>
          <span className="absolute -right-[30px] bottom-0 top-0 flex flex-col items-center gap-0.5 text-[10px] font-semibold tabular-nums text-brand-ink">
            <span className="w-px flex-1 bg-brand-ink/70" />
            44
            <span className="w-px flex-1 bg-brand-ink/70" />
          </span>
          <MousePointer2
            size={18}
            className="bento-anim absolute left-[62%] top-[55%] fill-paper text-ink drop-shadow transition-transform duration-700 [transition-timing-function:var(--ease-smooth)] [transform:translate(46px,38px)] group-data-[on=true]/v:[transform:none]"
          />
        </div>
      </BrowserFrame>

      {/* spec popover: real computed values of that button */}
      <dl className="bento-anim relative z-10 -mt-4 ml-auto grid w-full grid-cols-2 gap-x-5 gap-y-3.5 rounded-2xl border border-line-strong bg-surface/95 p-4 shadow-2 backdrop-blur transition-transform duration-500 [transition-timing-function:var(--ease-smooth)] group-data-[on=true]/v:-translate-y-1 sm:mr-3 sm:w-[300px]">
        <Spec size="sm" label="Font" value="Inter" note="Medium 500" />
        <Spec size="sm" label="Size / line" value="15 / 22.5 px" />
        <Spec size="sm" label="Padding" value="0 · 20 · 0 · 20" />
        <Spec size="sm" label="Radius" value="12 px" />
        <Spec
          size="sm"
          className="col-span-2"
          label="Background"
          value={
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <Swatch size="xs" hex="#2F66E0" />
              <span className="text-ink-3">→</span>
              <Swatch size="xs" hex="#22C27E" />
            </span>
          }
        />
      </dl>
    </div>
  );
}

/* ───────── Freeze hover states ───────── */

function FreezeVisual() {
  return (
    <div className="relative w-full max-w-[540px] pb-4">
      <BrowserFrame url="qasync.app">
        <Image src="/showcase/menu-frozen-v2.webp" alt="QASync's Product menu held open on the live site" width={642} height={370} sizes="(min-width: 1024px) 540px, 90vw" className="block h-auto w-full" />
        {/* frost: a cool rim appears while the state is held */}
        <span aria-hidden className="bento-anim pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_transparent] transition-shadow duration-500 group-data-[on=true]/v:shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--brand-ink)_45%,transparent)]" />
      </BrowserFrame>
      <span className="bento-anim absolute -top-3 right-3 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-surface px-2.5 py-1 text-[11.5px] font-medium text-brand-ink shadow-2 transition-transform duration-300 group-data-[on=true]/v:scale-105">
        <Snowflake size={12} /> Frozen
      </span>
      {/* the F key: presses down on hover */}
      <span
        aria-hidden
        className="bento-anim absolute -left-2 bottom-0 flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface text-[14px] font-semibold text-ink shadow-[0_4px_0_0_var(--line-strong)] transition-[transform,box-shadow] duration-150 group-data-[on=true]/v:translate-y-[3px] group-data-[on=true]/v:shadow-[0_1px_0_0_var(--line-strong)]"
      >
        F
      </span>
    </div>
  );
}

/* ───────── Clients without logins ───────── */

function ShareVisual() {
  return (
    <div className="relative w-full max-w-[470px] pt-11">
      {/* the share link */}
      <div className="absolute left-1/2 top-0 z-10 flex w-[86%] -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-surface/95 py-1 pl-3 pr-1 shadow-2 backdrop-blur">
        <Link2 size={13} className="shrink-0 text-brand-ink" />
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">qasync.app/r/7Kf2…/pricing</span>
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3" aria-hidden>
          <Copy size={11} className="bento-anim absolute transition-opacity duration-300 group-data-[on=true]/v:opacity-0" />
          <Check size={12} strokeWidth={3} className="bento-anim absolute text-pass opacity-0 transition-opacity duration-300 group-data-[on=true]/v:opacity-100" />
        </span>
      </div>

      <BrowserFrame url="qasync.app/pricing">
        <Image src="/showcase/page-pricing.webp" alt="QASync's pricing page, shared with a guest who left a comment" width={720} height={455} sizes="(min-width: 1024px) 470px, 90vw" className="block h-auto w-full" />
        {/* the guest's pin on "Get Pro" */}
        <span
          aria-hidden
          className="bento-anim absolute flex h-6 w-6 items-center justify-center rounded-[12px_12px_12px_3px] bg-brand text-[11px] font-semibold text-white shadow-2 ring-2 ring-paper transition-transform duration-300 group-data-[on=true]/v:scale-110"
          style={{ left: "76%", top: "84%", transform: "translate(-3px, -100%)" }}
        >
          J
        </span>
      </BrowserFrame>

      {/* the guest's comment */}
      <div className="bento-anim relative z-10 -mt-10 mr-auto w-[78%] rounded-xl border border-line-strong bg-surface p-3 shadow-2 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)] group-data-[on=true]/v:-translate-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-ink">J</span>
          <span className="text-[12px] font-medium text-ink">Jordan</span>
          <span className="text-[11px] text-ink-3">Guest · no account</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-ink-2">Can the Pro button say “per month”?</p>
      </div>
    </div>
  );
}

/* ───────── Every screen size ───────── */

/** A screenshot that scrolls inside its device when the card is hovered (all three move together). */
function Scroller({ src, alt, w, h, sizes }: { src: string; alt: string; w: number; h: number; sizes: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes={sizes}
      className="bento-anim absolute inset-x-0 top-0 h-auto w-full transition-transform duration-[2600ms] ease-in-out group-data-[on=true]/v:-translate-y-[45%]"
    />
  );
}

function DevicesVisual() {
  return (
    <div className="w-full max-w-[600px]">
      <div className="relative mx-auto aspect-[560/300] w-full">
        <BrowserFrame url="qasync.app" className="absolute left-0 top-0 w-[66%]">
          <div className="relative aspect-[1425/900] overflow-hidden">
            <Scroller src="/showcase/home-desktop.webp" alt="QASync's home page at 1440 px" w={900} h={1642} sizes="(min-width: 1024px) 400px, 60vw" />
          </div>
        </BrowserFrame>
        <TabletFrame className="absolute bottom-0 left-[54%] w-[27%]">
          <div className="relative aspect-[805/1180]">
            <Scroller src="/showcase/home-tablet.webp" alt="The same page at 820 px" w={480} h={1550} sizes="(min-width: 1024px) 170px, 26vw" />
          </div>
        </TabletFrame>
        <PhoneFrame className="absolute bottom-0 right-0 w-[15%]">
          <div className="relative aspect-[378/852]">
            <Scroller src="/showcase/home-phone.webp" alt="The same page at 393 px" w={300} h={2063} sizes="(min-width: 1024px) 96px, 16vw" />
          </div>
        </PhoneFrame>
      </div>
      <div className="mt-4 flex justify-center gap-2 font-mono text-[11px] tabular-nums text-ink-3">
        {["1440", "820", "393"].map((w) => (
          <span key={w} className="rounded-full border border-line bg-surface px-2.5 py-0.5">
            {w} px
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Page-by-page QA ───────── */

const PAGES = [
  { name: "Home", src: "/showcase/page-home.webp", status: "Passed", color: "var(--pass)" },
  { name: "Pricing", src: "/showcase/page-pricing.webp", status: "Ready", color: "var(--st-fixed)" },
  { name: "Capture", src: "/showcase/page-capture.webp", status: "In review", color: "var(--st-progress)" },
  { name: "Integrations", src: "/showcase/page-integrations.webp", status: "Not reviewed", color: "var(--ink-3)" },
];

/** Page thumbnails with their status, and the site's progress under them. */
function PagesVisual() {
  return (
    <div className="w-full max-w-[500px]">
    <ul className="grid w-full grid-cols-2 gap-3">
      {PAGES.map((p, i) => (
        <li
          key={p.name}
          style={{ transitionDelay: `${i * 40}ms` }}
          className="bento-anim overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)] group-data-[on=true]/v:-translate-y-1.5"
        >
          <div className="relative aspect-[16/9] overflow-hidden border-b border-line">
            <Image src={p.src} alt={`QASync's ${p.name} page`} width={720} height={455} sizes="(min-width: 1024px) 280px, 45vw" className="h-full w-full object-cover object-top" />
          </div>
          <div className="px-3 py-2.5">
            <span className="block truncate text-[12.5px] font-medium text-ink">{p.name}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: p.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
              {p.status}
            </span>
          </div>
        </li>
      ))}
    </ul>
    <PagesSummary />
    </div>
  );
}

function PagesSummary() {
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface/80 px-4 py-3 backdrop-blur">
      <div className="flex justify-between text-[12px] text-ink-3">
        <span>Site progress</span>
        <span className="tabular-nums">1 of 4 signed off</span>
      </div>
      <div className="mt-2 flex h-1.5 gap-1 overflow-hidden rounded-full" aria-hidden>
        {PAGES.map((p) => (
          <span key={p.name} className="flex-1 rounded-full" style={{ background: p.status === "Not reviewed" ? "var(--line-strong)" : p.color }} />
        ))}
      </div>
    </div>
  );
}
