"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, CodeXml, Palette, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { FailBadge, Spec, Swatch } from "./spec";

/* ───────── "One pin, three views" ─────────
 * Left: three role cards (a tablist). The active one opens to show its line.
 * Right: a lit stage with the same issue card, re-written for the active role.
 * All three views sit in one grid cell, so switching cross-fades without the
 * card changing height.
 */

const VIEWS = [
  {
    key: "designer",
    label: "Designer",
    icon: Palette,
    t: "Exact specs, not adjectives.",
    b: "The pin records the computed font, size, weight, line height, colour, padding and contrast of the element you clicked.",
  },
  {
    key: "developer",
    label: "Developer",
    icon: CodeXml,
    t: "A selector you can paste.",
    b: "Every issue carries a stable CSS selector, the browser, OS, viewport, pixel ratio and console errors from just before the report.",
  },
  {
    key: "client",
    label: "Client",
    icon: UserRound,
    t: "Just a conversation.",
    b: "No account and no jargon. Clients see the pin, the thread and the status, and sign off when it's right.",
  },
] as const;

type Key = (typeof VIEWS)[number]["key"];

export function ThreeViews() {
  const [view, setView] = useState<Key>("designer");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = VIEWS.findIndex((v) => v.key === view);
  const current = VIEWS[idx];

  function onKey(e: KeyboardEvent) {
    const d =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + VIEWS.length) % VIEWS.length;
    setView(VIEWS[n].key);
    tabs.current[n]?.focus();
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
      {/* role cards */}
      <div
        role="tablist"
        aria-label="Read the issue as"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="space-y-3"
      >
        {VIEWS.map((v, i) => {
          const on = v.key === view;
          const Icon = v.icon;
          return (
            // data-reveal lives on a wrapper whose class never changes: React rewrites the
            // button's className on every switch, which would drop the is-visible class.
            <div
              key={v.key}
              role="presentation"
              data-reveal
              style={{ "--d": i * 90 } as React.CSSProperties}
            >
              <button
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`tv-tab-${v.key}`}
                aria-selected={on}
                aria-controls="tv-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setView(v.key)}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-2xl border p-5 text-left transition-[background-color,border-color,box-shadow] duration-500 [transition-timing-function:var(--ease-smooth)]",
                  on
                    ? "border-brand/40 bg-surface shadow-2"
                    : "border-line bg-transparent hover:border-line-strong hover:bg-surface/50",
                )}
              >
                {/* soft brand light in the corner of the active card */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand/25 blur-3xl transition-opacity duration-700",
                    on ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="relative flex items-center gap-4">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500",
                      on
                        ? "border-transparent bg-brand text-white"
                        : "border-line bg-surface text-ink-3 group-hover:text-ink-2",
                    )}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-500",
                        on ? "text-brand-ink" : "text-ink-3",
                      )}
                    >
                      For the {v.label.toLowerCase()}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-[18px] font-semibold tracking-[-0.015em] transition-colors duration-500",
                        on ? "text-ink" : "text-ink-2",
                      )}
                    >
                      {v.t}
                    </span>
                  </span>
                </span>
                {/* the line opens under the active card */}
                <span
                  className={cn(
                    "tv-anim relative grid transition-[grid-template-rows,opacity] duration-500 [transition-timing-function:var(--ease-smooth)]",
                    on
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <span className="overflow-hidden">
                    <span className="block pl-[60px] pt-2 text-pretty text-[14.5px] leading-[1.65] text-ink-2">
                      {v.b}
                    </span>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* the stage */}
      <div
        data-reveal
        className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface-2/40 p-4 sm:p-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand/30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
        />
        <span
          aria-hidden
          className="hiw-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]"
        />

        <div className="mb-4 flex items-center justify-between gap-3">
          <span
            key={view}
            className="animate-in-up inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-1 backdrop-blur"
          >
            <current.icon size={14} className="text-brand-ink" />
            Viewing as {current.label.toLowerCase()}
          </span>
          <span className="flex items-center gap-2 text-[12px] text-ink-3">
            <span className="flex -space-x-1.5" aria-hidden>
              <Avatar c="var(--brand)">M</Avatar>
              <Avatar c="var(--st-progress)">A</Avatar>
              <Avatar c="var(--pass)">J</Avatar>
            </span>
            <span className="hidden sm:inline">1 pin · 3 readers</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px_14px_14px_3px] bg-[var(--st-progress)] text-[12px] font-semibold text-white">
              3
            </span>
            <div className="min-w-0">
              <div className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                Primary CTA colour doesn&apos;t match the design
              </div>
              <div className="mt-1 text-[12.5px] text-ink-3">
                Home · Desktop 1440px · Maya, 2h ago
              </div>
            </div>
          </div>

          <div
            id="tv-panel"
            role="tabpanel"
            aria-labelledby={`tv-tab-${view}`}
            className="grid px-5 py-5"
          >
            <Pane on={view === "designer"}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Spec label="Font" value="DM Sans" note="Bold 700" />
                <Spec label="Size / line height" value="16 / 24 px" />
                <Spec label="Text colour" value={<Swatch hex="#FFFFFF" />} />
                <Spec label="Padding" value="15 · 26 · 15 · 26" />
                <Spec
                  label="Background"
                  value={
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <Swatch hex="#1A9AA6" />
                      <span className="text-[13px] font-semibold text-danger">
                        ≠
                      </span>
                      <Swatch hex="#0E7C86" note="design" />
                    </span>
                  }
                />
                <Spec
                  label="Contrast"
                  value={
                    <span className="flex items-center gap-2">
                      3.38 : 1<FailBadge>Fails AA</FailBadge>
                    </span>
                  }
                />
              </dl>
            </Pane>

            <Pane on={view === "developer"}>
              <div className="space-y-5">
                <div>
                  <div className="text-[12px] font-medium text-ink-3">
                    Selector
                  </div>
                  <div className="mt-1.5 inline-flex rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-[13px] text-brand-ink">
                    #hero-cta
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-4">
                  <Spec label="Browser" value="Chrome 131" />
                  <Spec label="System" value="macOS 14.5" />
                  <Spec label="Viewport" value="1280 × 800" note="@2x" />
                </dl>
                <div>
                  <div className="text-[12px] font-medium text-ink-3">
                    Console
                  </div>
                  <ul className="mt-1.5 space-y-1.5 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 font-mono text-[12px] text-danger">
                    <li>GET /api/cart 404 (Not Found)</li>
                    <li>TypeError: price is undefined · cart.js:42</li>
                  </ul>
                </div>
              </div>
            </Pane>

            <Pane on={view === "client"}>
              <div className="space-y-3 text-sm">
                <Bubble
                  who="Jordan (client)"
                  text="The button looks lighter than in the mockup we approved."
                />
                <Bubble
                  who="Maya"
                  text="Good catch. The token was out of date. Fixed on staging, can you take a look?"
                  me
                />
                <div className="flex items-center gap-2 rounded-lg bg-pass-soft px-3 py-2 text-[13px] font-medium text-pass">
                  <Check size={14} strokeWidth={2.75} /> Jordan signed off ·
                  Verified
                </div>
              </div>
            </Pane>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One view of the card. All panes share a grid cell; the inactive ones fade out and leave the tab order. */
function Pane({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!on}
      inert={!on}
      className={cn(
        "tv-anim [grid-area:1/1] transition-[opacity,transform,filter] duration-500 [transition-timing-function:var(--ease-smooth)]",
        on
          ? "opacity-100 [transform:none] [filter:none]"
          : "pointer-events-none translate-y-2 opacity-0 blur-[2px]",
      )}
    >
      {children}
    </div>
  );
}

function Bubble({
  who,
  text,
  me,
}: {
  who: string;
  text: string;
  me?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5",
        me
          ? "ml-auto rounded-br-md bg-brand text-white"
          : "rounded-bl-md bg-surface-2 text-ink",
      )}
    >
      <div
        className={cn(
          "text-[11px] font-medium",
          me ? "text-white/75" : "text-ink-3",
        )}
      >
        {who}
      </div>
      {text}
    </div>
  );
}

function Avatar({ c, children }: { c: string; children: ReactNode }) {
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-semibold text-white ring-2 ring-surface"
      style={{ background: c }}
    >
      {children}
    </span>
  );
}
