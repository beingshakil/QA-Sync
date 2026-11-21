"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FailBadge, Spec, Swatch } from "./spec";

/* ── Paste-a-URL hero input: creates a project and drops you into the canvas ── */
/** variant "gradient" is the hero's brand button; "solid" is the quieter one used elsewhere. */
export function UrlStart({ size = "lg", className, variant = "solid" }: { size?: "md" | "lg"; className?: string; variant?: "solid" | "gradient" }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setErr("Enter the address of the site you want to review.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    if (res.status === 401) {
      // Signed out: sign in first, then open this site in the canvas.
      router.push(`/login?next=${encodeURIComponent(`/app/start?url=${encodeURIComponent(url)}`)}`);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    router.push(`/app/projects/${data.id}/review${data.openPage ? `?page=${encodeURIComponent(data.openPage)}` : ""}`);
  }

  return (
    <form onSubmit={go} className={cn("w-full max-w-xl", className)}>
      <div
        className={cn(
          "flex items-center gap-2 p-1.5 transition",
          // hero: the same orbiting blue→green ring as the account button; elsewhere a plain border
          variant === "gradient" ? "ring-flow rounded-2xl shadow-2 [--ring-fill:var(--surface)]" : "rounded-xl border border-line-strong bg-surface shadow-1 focus-within:border-ink-3",
          size === "lg" ? "pl-4" : "pl-3",
        )}
      >
        <span className="hidden text-[15px] text-ink-3 sm:inline">https://</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yoursite.com"
          aria-label="Website URL"
          className={cn("min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3", size === "lg" ? "h-11 text-[15px]" : "h-9 text-sm")}
        />
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 font-medium transition disabled:opacity-70",
            variant === "gradient" ? "btn-sheen rounded-xl bg-grad-brand text-white shadow-1 hover:brightness-105" : "rounded-lg bg-ink text-paper hover:opacity-90",
            size === "lg" ? "h-11 px-5 text-[15px]" : "h-9 px-4 text-sm",
          )}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Start reviewing
          {!busy && <ArrowRight size={16} />}
        </button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
    </form>
  );
}

/* ── "One pin, three views" ── */
const VIEWS = [
  { key: "designer", label: "Designer" },
  { key: "developer", label: "Developer" },
  { key: "client", label: "Client" },
] as const;

export function ThreeViews() {
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("designer");
  return (
    <div className="grid items-start gap-8 md:grid-cols-[1fr_1.2fr]">
      <div>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn("rounded-lg px-4 py-3 text-sm font-medium transition sm:py-2", view === v.key ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div key={view} className="animate-in-up mt-6 space-y-3 text-ink-2">
          {view === "designer" && (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">Exact specs, not adjectives.</h3>
              <p>The pin records the computed font, size, weight, line height, colour, padding and contrast of the element you clicked.</p>
            </>
          )}
          {view === "developer" && (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">A selector you can paste.</h3>
              <p>Every issue carries a stable CSS selector, the browser, OS, viewport, pixel ratio and console errors from just before the report.</p>
            </>
          )}
          {view === "client" && (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">Just a conversation.</h3>
              <p>No account and no jargon. Clients see the pin, the thread and the status, and sign off when it&apos;s right.</p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface-2/60 p-5 sm:p-8">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px_14px_14px_3px] bg-[#f97316] text-[12px] font-semibold text-white">3</span>
          <div className="min-w-0">
            <div className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">Primary CTA colour doesn&apos;t match the design</div>
            <div className="mt-1 text-[12.5px] text-ink-3">Home · Desktop 1440px · Maya, 2h ago</div>
          </div>
        </div>
        <div className="px-5 py-5">
        {view === "designer" && (
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
                  <span className="text-[13px] font-semibold text-danger">≠</span>
                  <Swatch hex="#0E7C86" note="design" />
                </span>
              }
            />
            <Spec
              label="Contrast"
              value={
                <span className="flex items-center gap-2">
                  3.38 : 1
                  <FailBadge>Fails AA</FailBadge>
                </span>
              }
            />
          </dl>
        )}
        {view === "developer" && (
          <div className="space-y-5">
            <div>
              <div className="text-[12px] font-medium text-ink-3">Selector</div>
              <div className="mt-1.5 inline-flex rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-[13px] text-brand-ink">#hero-cta</div>
            </div>
            <dl className="grid grid-cols-3 gap-4">
              <Spec label="Browser" value="Chrome 131" />
              <Spec label="System" value="macOS 14.5" />
              <Spec label="Viewport" value="1280 × 800" note="@2x" />
            </dl>
            <div>
              <div className="text-[12px] font-medium text-ink-3">Console</div>
              <ul className="mt-1.5 space-y-1.5 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 font-mono text-[12px] text-danger">
                <li>GET /api/cart 404 (Not Found)</li>
                <li>TypeError: price is undefined · cart.js:42</li>
              </ul>
            </div>
          </div>
        )}
        {view === "client" && (
          <div className="space-y-3 text-sm">
            <Bubble who="Jordan (client)" text="The button looks lighter than in the mockup we approved." />
            <Bubble who="Maya" text="Good catch. The token was out of date. Fixed on staging, can you take a look?" me />
            <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--st-verified)_12%,transparent)] px-3 py-2 text-[13px] font-medium text-[var(--st-verified)]">
              ✓ Jordan signed off · Verified
            </div>
          </div>
        )}
        </div>
      </div>
      </div>
    </div>
  );
}

function Bubble({ who, text, me }: { who: string; text: string; me?: boolean }) {
  return (
    <div className={cn("max-w-[85%] rounded-xl px-3 py-2", me ? "ml-auto bg-ink text-paper" : "bg-surface-2")}>
      <div className={cn("text-[11px] font-medium", me ? "text-paper/70" : "text-ink-3")}>{who}</div>
      {text}
    </div>
  );
}

/* ── Hero rotating word: noticed → reviewed → fixed (the product's own flow) ── */
const HERO_WORDS = ["noticed.", "reviewed.", "fixed."];
const HERO_TONES = ["noticed", "reviewed", "fixed"]; // colour per stage: light blue → blue/teal → blue/green
const HERO_HOLD = [1900, 1900, 3800]; // "fixed" holds longest: it's the promise

export function RotatingWord() {
  // Start on "fixed." so first paint, no-JS and reduced motion all read the real headline.
  const [i, setI] = useState(HERO_WORDS.length - 1);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      setPrev(i);
      setI((i + 1) % HERO_WORDS.length);
    }, HERO_HOLD[i]);
    return () => clearTimeout(t);
  }, [i]);

  return (
    <>
      <span className="sr-only">fixed.</span>
      <span className="rw" aria-hidden>
        {HERO_WORDS.map((word, k) => (
          <span
            key={word}
            data-tone={HERO_TONES[k]}
            className={cn("rw-word", k === i && "is-active", k === prev && "is-leaving")}
            style={{ "--n": word.length } as React.CSSProperties}
          >
            {[...word].map((ch, j) => (
              <span key={j} className="rw-ch" style={{ "--i": j } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        ))}
      </span>
    </>
  );
}
