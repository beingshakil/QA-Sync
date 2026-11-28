import { Check, Minus, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { ButtonLink } from "@/components/ui";
import { FAQ } from "@/content/marketing";
import { cn } from "@/lib/utils";
import { UrlStart } from "./interactive";

/** Stagger helper for [data-reveal] children: style={d(120)} → 120ms delay. */
export const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28", className)}>
      {children}
    </section>
  );
}

/**
 * Section headline: no label above it, the heading carries its own weight. Balanced so no
 * single word is left on its own line; the accent clause takes the brand gradient.
 */
export function SectionHead({
  title,
  accent,
  sub,
  center,
  className,
  size = "md",
}: {
  title: string;
  accent?: string;
  sub?: string;
  center?: boolean;
  className?: string;
  /** "sm" for headings that sit in a narrow column beside a visual */
  size?: "md" | "sm";
}) {
  return (
    <div data-reveal className={cn(size === "md" ? "max-w-5xl" : "max-w-3xl", center && "mx-auto text-center", className)}>
      <h2
        className={cn(
          "text-balance font-semibold text-ink",
          size === "md"
            ? "text-[32px] leading-[1.1] tracking-[-0.028em] sm:text-[40px] md:text-[50px] md:leading-[1.08] md:tracking-[-0.032em]"
            : "text-[30px] leading-[1.1] tracking-[-0.028em] sm:text-[34px] md:text-[36px] md:leading-[1.1]",
        )}
      >
        {/* Each clause is an inline-block, so a line break falls between the two clauses, not inside
            one (a clause still wraps internally when it's wider than the screen). */}
        <span className="inline-block">{title}</span>
        {accent && (
          <>
            {" "}
            <span className="text-gradient-scroll inline-block">{accent}</span>
          </>
        )}
      </h2>
      {sub && <p className={cn("mt-6 max-w-[40rem] text-pretty text-[17px] leading-[1.65] text-ink-2 md:text-[18px]", center && "mx-auto")}>{sub}</p>}
    </div>
  );
}

/** Gradient hairline used between major sections. */
export function Divider() {
  return <div className="hairline-grad mx-auto max-w-7xl" aria-hidden />;
}

export function FeatureGrid({ items, cols = 3 }: { items: { title: string; body: string; tag?: string; icon?: ReactNode }[]; cols?: 2 | 3 }) {
  return (
    <div className={cn("mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line", cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((f, i) => (
        <div key={f.title} data-reveal style={d((i % 3) * 90)} className="bg-surface p-6 transition-colors duration-300 hover:bg-surface-2/70 md:p-7">
          <div className="flex items-center gap-2">
            {f.icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-2">{f.icon}</span>}
            <h3 className="text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{f.title}</h3>
            {f.tag && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", f.tag === "Beta" || f.tag === "New" ? "bg-blue-soft text-blue" : "bg-surface-2 text-ink-3")}>
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

/* ── Spider-web backdrop for heroes: spokes fan out from the top centre, rings sag between them ── */
const WEB_CX = 800;
const WEB_SPOKES = 18; // across the lower half-circle
const WEB_RINGS = [64, 136, 216, 306, 404, 512, 630, 760, 900];
const webPt = (r: number, a: number) => [+(WEB_CX + r * Math.cos(a)).toFixed(1), +(r * Math.sin(a)).toFixed(1)] as const;
// Small deterministic wobble so the web looks hand-spun rather than ruled
const webJit = (i: number, j: number) => 1 + 0.035 * Math.sin(i * 12.9898 + j * 78.233);
const WEB_ANGLES = Array.from({ length: WEB_SPOKES + 1 }, (_, i) => (Math.PI * i) / WEB_SPOKES);
const WEB_SPOKE_PATH = WEB_ANGLES.map((a) => {
  const [x, y] = webPt(1100, a);
  return `M${WEB_CX} 0L${x} ${y}`;
}).join("");
const WEB_RING_PATH = WEB_RINGS.map((r, j) =>
  WEB_ANGLES.map((a, i) => {
    const [x, y] = webPt(r * webJit(i, j), a);
    if (i === 0) return `M${x} ${y}`;
    const [cx, cy] = webPt(r * 0.9, a - Math.PI / WEB_SPOKES / 2); // sag toward the centre
    return `Q${cx} ${cy} ${x} ${y}`;
  }).join(""),
).join("");
// A few "dew" points where threads cross: [ring index, spoke index, brand|accent]
const WEB_DEW: [number, number, 0 | 1][] = [[2, 4, 0], [3, 13, 1], [4, 7, 0], [5, 2, 1], [5, 16, 0], [6, 10, 1], [7, 5, 0], [7, 14, 1]];

export function SpiderWeb({ className }: { className?: string }) {
  return (
    <svg className={cn("web pointer-events-none absolute inset-0 h-full w-full", className)} viewBox="0 0 1600 820" preserveAspectRatio="xMidYMin slice" aria-hidden>
      <path d={WEB_SPOKE_PATH} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={WEB_RING_PATH} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {WEB_DEW.map(([j, i, c], k) => {
        const [x, y] = webPt(WEB_RINGS[j] * webJit(i, j), WEB_ANGLES[i]);
        return <circle key={k} className="web-dew" cx={x} cy={y} r="2.6" fill={c ? "var(--accent)" : "var(--brand)"} style={{ animationDelay: `${k * 0.7}s` }} />;
      })}
    </svg>
  );
}

export function PageHero({ title, accent, sub, children }: { title: string; accent: string; sub: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <div className="site-glow site-glow-soft" aria-hidden />
      <SpiderWeb />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 md:pb-24 md:pt-32">
        <h1 data-reveal className="max-w-4xl text-balance text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-ink sm:text-[56px] md:text-[72px] md:leading-[0.98]">
          {title} <span className="text-gradient-scroll">{accent}</span>
        </h1>
        <p data-reveal style={d(120)} className="mt-7 max-w-[38rem] text-pretty text-lg leading-relaxed text-ink-2">
          {sub}
        </p>
        {children && (
          <div data-reveal style={d(200)}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function CtaBand({ title = "Point at the problem.", accent = "Watch it get fixed." }: { title?: string; accent?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 md:pb-5">
      <div data-reveal className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 sm:px-10 md:px-16 md:py-20">
        <SpiderWeb />
        <div className="relative grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="max-w-xl text-balance text-[34px] font-semibold leading-[1.04] tracking-[-0.034em] text-ink md:text-[52px] md:tracking-[-0.038em]">
              {title} <span className="text-gradient-scroll">{accent}</span>
            </h2>
            <p className="mt-4 text-[16px] text-ink-2">Paste a URL to start. Free plan, no credit card, nothing to install.</p>
          </div>
          <UrlStart className="lg:w-[30rem]" />
        </div>
      </div>
    </section>
  );
}

/** FAQ accordion: no dividers; the open item sits on a soft card. The first question starts open. */
export function FaqList({ items = FAQ, className = "mt-10" }: { items?: { q: string; a: string }[]; className?: string }) {
  return (
    <div data-reveal className={cn("space-y-1.5", className)}>
      {items.map((f, i) => (
        <details
          key={f.q}
          open={i === 0}
          className="group rounded-2xl border border-transparent px-5 transition-colors duration-300 hover:bg-surface/50 open:border-line open:bg-surface [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-3 text-[16px] font-medium text-ink transition-colors hover:text-brand-ink">
            {f.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-3 transition duration-300 group-open:rotate-45 group-open:border-line-strong group-open:text-ink">
              <Plus size={14} />
            </span>
          </summary>
          <p className="max-w-2xl pb-5 pr-10 text-pretty leading-[1.7] text-ink-2">{f.a}</p>
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
