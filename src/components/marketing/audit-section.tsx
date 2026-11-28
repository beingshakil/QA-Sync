"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown, Link2, ListChecks, RotateCw, Search, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── SEO audit: "See your page the way Google does" ─────────
 * Left: a lit stage with two layered cards: how the page shows up in Google, and
 * the audit of that page. When the stage scrolls into view the score ring draws
 * and counts up and the 12 check segments fill one by one. Each check opens to
 * show what was found; the failing one starts open with its fix.
 * Right: the three points as icon cards.
 * The page is a made-up studio site; character counts come from the strings below.
 * With reduced motion everything shows in its final state (.bento-anim, no count-up).
 */

const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

const PAGE = {
  host: "northwind.studio",
  path: "northwind.studio › work",
  title: "Northwind Studio: Brand and Web Design for Growing Startups",
  description:
    "Northwind is a small studio that designs brands, websites and product UI for startups. See recent work for fintech, health and climate teams, then book a call.",
};

const SCORE = 92;
const CHECKS_PASSED = 11;
const CHECKS_TOTAL = 12;

type Row = { label: string; pass: boolean; badge: string; detail: ReactNode };

const ROWS: Row[] = [
  {
    label: "Meta title",
    pass: true,
    badge: `${PAGE.title.length} characters`,
    detail: <Quote>{PAGE.title}</Quote>,
  },
  {
    label: "Meta description",
    pass: true,
    badge: `${PAGE.description.length} characters`,
    detail: <Quote>{PAGE.description}</Quote>,
  },
  {
    label: "Heading structure",
    pass: true,
    badge: "1 H1, in order",
    detail: (
      <ul className="space-y-1 font-mono text-[11.5px]">
        <li>
          <span className="text-brand-ink">H1</span> Selected work
        </li>
        <li className="pl-4">
          <span className="text-ink-3">H2</span> Fintech · <span className="text-ink-3">H2</span> Health · <span className="text-ink-3">H2</span> Climate
        </li>
      </ul>
    ),
  },
  {
    label: "Image alt text",
    pass: false,
    badge: "11 without alt",
    detail: (
      <p className="rounded-lg bg-danger-soft px-3 py-2 text-danger">
        <span className="font-semibold">Fix:</span> add alt text to the 11 images that need it, describing what each one shows. Decorative images can use an empty alt.
      </p>
    ),
  },
  {
    label: "Canonical tag",
    pass: true,
    badge: "Self-referencing",
    detail: <code className="font-mono text-[11.5px] text-ink">https://{PAGE.host}/work</code>,
  },
  {
    label: "Open Graph tags",
    pass: true,
    badge: "Complete",
    detail: <code className="font-mono text-[11.5px] text-ink">og:title · og:description · og:image 1200×630</code>,
  },
];

const POINTS = [
  { icon: ListChecks, t: "12 clear checks", b: "On-page and technical: title, description, headings, images, links, URL, canonical, schema and more." },
  { icon: Wrench, t: "A fix for every red item", b: "Not just “failed”: each problem says exactly what to change." },
  { icon: Link2, t: "Links you can trust", b: "Every link is tested, blocked and broken are told apart, and navbar and footer links can be left out." },
] as const;

export function AuditSection() {
  return (
    <div className="mt-12 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <AuditStage />
      </div>
      <ul className="space-y-3 lg:col-span-5">
        {POINTS.map(({ icon: Icon, t, b }, i) => (
          <li
            key={t}
            data-reveal
            style={d(i * 100)}
            className="group flex gap-4 rounded-2xl border border-line bg-surface/40 p-5 transition-colors duration-300 hover:border-line-strong hover:bg-surface"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-brand-soft text-brand-ink transition-colors duration-300 group-hover:border-brand/40">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[17px] font-semibold tracking-[-0.012em] text-ink">{t}</h3>
              <p className="mt-1.5 text-pretty text-[14.5px] leading-[1.6] text-ink-2">{b}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── the stage ───────── */

function AuditStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [score, setScore] = useState(0);
  const [open, setOpen] = useState(3); // the failing check starts open

  // play once, the first time the stage is mostly in view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // count the score up alongside the ring (or jump straight there with reduced motion)
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScore(SCORE);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setScore(Math.round(SCORE * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen]);

  const r = 28;
  const c = 2 * Math.PI * r;

  return (
    <div ref={ref} data-reveal className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface p-4 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 -z-10 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-72 w-72 rounded-full bg-accent/12 blur-3xl" />
      <span aria-hidden className="hiw-grid pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />

      {/* how Google shows the page */}
      <div className="relative w-full rounded-2xl border border-line-strong bg-surface/90 p-4 pb-6 shadow-2 backdrop-blur sm:w-[86%] sm:pb-10">
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <Search size={12} className="text-brand-ink" />
          <span className="font-mono uppercase tracking-[0.14em]">Search preview</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink ring-1 ring-line-strong">N</span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[12.5px] text-ink">Northwind Studio</div>
            <div className="truncate text-[11.5px] text-ink-3">{PAGE.path}</div>
          </div>
        </div>
        <div className="mt-2 text-[15.5px] font-medium leading-snug text-brand-ink">{PAGE.title}</div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">{PAGE.description}</p>
      </div>

      {/* the audit, layered over the preview */}
      <div className="relative z-10 -mt-3 ml-auto w-full overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2 sm:-mt-6 sm:w-[92%]">
        <div className="flex items-center gap-4 border-b border-line px-4 py-4 sm:px-5">
          <div className="relative h-[68px] w-[68px] shrink-0">
            <svg width="68" height="68" className="-rotate-90" aria-hidden>
              <circle cx="34" cy="34" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="6" />
              <circle
                cx="34"
                cy="34"
                r={r}
                fill="none"
                stroke="var(--pass)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={seen ? c * (1 - SCORE / 100) : c}
                className="bento-anim transition-[stroke-dashoffset] duration-[1400ms] [transition-timing-function:var(--ease-smooth)]"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[19px] font-semibold tabular-nums text-ink" aria-label={`SEO score ${SCORE}`}>
              {seen ? score : 0}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[14px] font-semibold text-ink">
                SEO score{" "}
                <span className="font-normal text-ink-3">
                  · {CHECKS_PASSED} of {CHECKS_TOTAL} passed
                </span>
              </div>
              <span className="hidden items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3 sm:inline-flex">
                <RotateCw size={11} /> 2 min ago
              </span>
            </div>
            <div className="mt-3 flex gap-1" aria-hidden>
              {Array.from({ length: CHECKS_TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "bento-anim h-1.5 flex-1 rounded-full transition-colors duration-300",
                    !seen ? "bg-line-strong" : i === CHECKS_TOTAL - 1 ? "bg-danger" : "bg-pass",
                  )}
                  style={{ transitionDelay: seen ? `${200 + i * 70}ms` : "0ms" }}
                />
              ))}
            </div>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {ROWS.map((row, i) => {
            const on = open === i;
            return (
              <li key={row.label}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? -1 : i)}
                  className={cn("flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 sm:px-5", on && "bg-surface-2/40")}
                >
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", row.pass ? "bg-pass-soft text-pass" : "bg-danger-soft text-danger")}>
                    {row.pass ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{row.label}</span>
                  <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular-nums sm:inline", row.pass ? "bg-pass-soft text-pass" : "bg-danger-soft text-danger")}>
                    {row.badge}
                  </span>
                  <ChevronDown size={15} className={cn("bento-anim shrink-0 text-ink-3 transition-transform duration-300", on && "rotate-180")} />
                </button>
                <div className={cn("bento-anim grid transition-[grid-template-rows] duration-500 [transition-timing-function:var(--ease-smooth)]", on ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-3.5 pl-12 text-[12.5px] leading-relaxed text-ink-2 sm:px-5 sm:pl-[52px]">
                      <span className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums sm:hidden" style={{ background: row.pass ? "var(--pass-soft)" : "var(--danger-soft)", color: row.pass ? "var(--pass)" : "var(--danger)" }}>
                        {row.badge}
                      </span>
                      {row.detail}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-line bg-paper/60 px-3 py-2 text-ink">“{children}”</p>;
}
