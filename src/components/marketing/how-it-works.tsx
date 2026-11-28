"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BadgeCheck, Bot, Check, MessagesSquare, MousePointerClick, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── How it works: the four statuses an issue moves through ─────────
 * Left: one issue on a mock page, shown in the state of the active step.
 * Right: the four steps on a vertical rail. While the section is in view the
 * active step's rail fills over STEP_MS and hands over to the next step (the CSS
 * animation is the timer, so with reduced motion there is no autoplay). Hovering
 * or focusing the list pauses it; clicking a step selects it and stops it.
 */

const STEPS = [
  {
    status: "Open",
    color: "var(--st-open)",
    icon: MousePointerClick,
    cue: "Click to pin",
    t: "Pin it",
    b: "Click any element on the live page. The pin keeps its selector, styles, screen size and console errors.",
  },
  {
    status: "In review",
    color: "var(--st-review)",
    icon: MessagesSquare,
    cue: "@mention Arjun",
    t: "Talk it through",
    b: "Teammates and clients reply on the pin. @mention someone to hand it over.",
  },
  {
    status: "Fixed",
    color: "var(--st-fixed)",
    icon: Wrench,
    cue: "Ship the fix",
    t: "Fix it",
    b: "A developer, or an AI agent over MCP, ships the change with everything it needs in the issue.",
  },
  {
    status: "Verified",
    color: "var(--pass)",
    icon: BadgeCheck,
    cue: "Check it live",
    t: "Verify it",
    b: "Whoever reported it checks the live page and marks it Verified, or reopens it with a note.",
  },
] as const;

const STEP_MS = 5200;
const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = STEPS[active];
  const running = auto && inView && !hover;

  return (
    <div ref={ref} className="mt-12 grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
      <IssueStage active={active} />

      <ol className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.t} data-reveal style={{ "--d": i * 90 } as CSSProperties} className="relative pl-3 sm:pl-6">
              {/* the rail: a dim hairline; the active step's part fills in its colour, then hands over */}
              <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 overflow-hidden rounded-full bg-line-strong">
                {on && (
                  <span
                    key={`${active}-${auto}`}
                    className={cn("hiw-progress absolute inset-0 origin-top rounded-full", !auto && "hiw-progress-done")}
                    style={{ background: s.color, animationDuration: `${STEP_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                    onAnimationEnd={() => auto && setActive((a) => (a + 1) % STEPS.length)}
                  />
                )}
              </span>
              <button
                type="button"
                aria-pressed={on}
                aria-controls="hiw-stage"
                onClick={() => {
                  setActive(i);
                  setAuto(false);
                }}
                className={cn(
                  "group flex w-full items-start gap-3.5 rounded-2xl p-3.5 text-left transition-colors duration-300 sm:gap-5 sm:p-5",
                  on ? "bg-surface" : "hover:bg-surface/60",
                )}
              >
                <StepIcon on={on} i={i} />
                <span className="min-w-0 flex-1">
                  <StepLabel i={i} on={on} />
                  <span className={cn("mt-1.5 block text-[18px] font-semibold tracking-[-0.015em] transition-colors duration-300", on ? "text-ink" : "text-ink-2")}>{s.t}</span>
                  <span className={cn("mt-1.5 block text-pretty text-[14.5px] leading-[1.65] transition-colors duration-300", on ? "text-ink-2" : "text-ink-3")}>{s.b}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" aria-live="polite">
        Step {active + 1} of 4: {step.t}, status {step.status}.
      </p>
    </div>
  );
}

function StepIcon({ on, i }: { on: boolean; i: number }) {
  const { color, icon: Icon } = STEPS[i];
  return (
    <span
      className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300", on ? "border-transparent" : "border-line bg-surface text-ink-3 group-hover:text-ink-2")}
      style={on ? { background: tint(color, 16), color, boxShadow: `inset 0 0 0 1px ${tint(color, 35)}` } : undefined}
    >
      <Icon size={20} strokeWidth={1.75} />
    </span>
  );
}

function StepLabel({ i, on }: { i: number; on: boolean }) {
  const s = STEPS[i];
  return (
    <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
      <span className="tabular-nums">0{i + 1}</span>
      <span className="h-1 w-1 rounded-full" style={{ background: s.color }} />
      <span style={on ? { color: s.color } : undefined}>{s.status}</span>
    </span>
  );
}

/* ───────── Left: one issue on a mock page, in the active step's state ───────── */

function IssueStage({ active }: { active: number }) {
  const s = STEPS[active];
  return (
    <div id="hiw-stage" data-reveal className="relative mx-auto w-full max-w-[640px] sm:pb-16 lg:max-w-none">
      {/* soft glow in the step's colour behind the frame */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl transition-[background] duration-700" style={{ background: tint(s.color, 22) }} />

      {/* the page under review */}
      <div className="hiw-grid relative w-[94%] overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-2 sm:w-[82%]">
        <div className="flex h-10 items-center gap-2 border-b border-line px-4">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="ml-2 truncate rounded-md border border-line bg-paper px-2.5 py-0.5 text-[11.5px] text-ink-3">afternow.co/pricing</span>
        </div>
        <div className="relative space-y-3 px-6 pb-8 pt-8 sm:px-8">
          <span className="block h-2 w-16 rounded-full bg-brand-ink/40" />
          <span className="block h-4 w-4/5 rounded-md bg-ink-3/35" />
          <span className="block h-4 w-3/5 rounded-md bg-ink-3/35" />
          <span className="block h-2 w-11/12 rounded-full bg-line-strong" />
          <span className="block h-2 w-2/3 rounded-full bg-line-strong" />
          {/* pricing cards */}
          <div className="hidden grid-cols-3 gap-2.5 pt-4 sm:grid" aria-hidden>
            {[0, 1, 2].map((k) => (
              <div key={k} className={cn("space-y-2 rounded-xl border bg-paper/60 p-3", k === 1 ? "border-line-strong" : "border-line")}>
                <span className="block h-1.5 w-1/2 rounded-full bg-line-strong" />
                <span className="block h-3 w-2/3 rounded bg-ink-3/30" />
                <span className="block h-1.5 w-full rounded-full bg-line" />
                <span className="block h-1.5 w-4/5 rounded-full bg-line" />
              </div>
            ))}
          </div>
          <div className="relative inline-block pt-3">
            <span className="block h-9 w-36 rounded-lg bg-brand/80" />
            {/* selection outline + pin on the CTA */}
            <span aria-hidden className="pointer-events-none absolute -inset-1.5 top-1.5 rounded-xl border-[1.5px] border-dashed transition-colors duration-500" style={{ borderColor: s.color }} />
            <span
              aria-hidden
              className="absolute -right-3 -top-1 flex h-7 w-7 items-center justify-center rounded-[14px_14px_14px_3px] text-[12px] font-semibold text-white shadow-2 ring-2 ring-paper transition-colors duration-500"
              style={{ background: s.color }}
            >
              {active === 3 ? <Check size={14} strokeWidth={3} /> : "3"}
            </span>
          </div>
        </div>
      </div>

      {/* floating cue pill with a hand-drawn arrow towards the issue card */}
      <div className="absolute right-0 top-[18%] hidden items-start gap-1 sm:flex lg:right-[-4%]">
        <span key={active} className="animate-in-up inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
          {s.cue}
        </span>
        <svg aria-hidden width="26" height="34" viewBox="0 0 26 34" fill="none" className="mt-4 text-ink-3">
          <path d="M3 2c11 1 18 8 17 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 22l5 5 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* the issue card, overlapping the page like a popover */}
      <div className="relative z-10 -mt-5 ml-auto w-[90%] rounded-2xl sm:absolute sm:bottom-0 sm:right-0 sm:mt-0 sm:w-[62%] sm:max-w-85 border border-line-strong bg-surface p-4 shadow-2 sm:w-[62%]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[12px_12px_12px_3px] text-[11px] font-semibold text-white transition-colors duration-500" style={{ background: s.color }}>
            {active === 3 ? <Check size={12} strokeWidth={3} /> : "3"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold leading-snug text-ink">CTA colour doesn&apos;t match the design</div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">Pricing · Desktop 1440 · Maya</div>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-500"
            style={{ color: s.color, borderColor: tint(s.color, 40), background: tint(s.color, 10) }}
          >
            {s.status}
          </span>
        </div>
        <div key={active} className="animate-in-up mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-2">
          {active === 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-ink-3">Selector</dt>
              <dd className="truncate font-mono text-brand-ink">#pricing-cta</dd>
              <dt className="text-ink-3">Background</dt>
              <dd className="font-mono text-ink">rgb(26 154 166)</dd>
              <dt className="text-ink-3">Console</dt>
              <dd className="text-ink">2 errors captured</dd>
            </dl>
          )}
          {active === 1 && (
            <div className="space-y-2">
              <p>
                <span className="font-medium text-ink">Maya</span> Should be the darker teal from the design file.
              </p>
              <p>
                <span className="font-medium text-ink">Jordan</span> <span className="text-brand-ink">@Arjun</span> can you take this one?
              </p>
            </div>
          )}
          {active === 2 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Bot size={14} className="shrink-0 text-brand-ink" />
                <span>
                  <span className="font-medium text-ink">Agent over MCP</span> edited <span className="font-mono text-ink">pricing.css</span>
                </span>
              </p>
              <p>
                <span className="font-medium text-ink">Arjun</span> Matches the design now. On staging.
              </p>
            </div>
          )}
          {active === 3 && (
            <p className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pass-soft text-pass">
                <Check size={12} strokeWidth={3} />
              </span>
              <span>
                <span className="font-medium text-ink">Maya</span> checked the live page and marked it verified.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
