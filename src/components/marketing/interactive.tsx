"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
          "flex items-center gap-2 border border-line-strong bg-surface p-1.5 transition focus-within:border-ink-3",
          variant === "gradient" ? "rounded-2xl shadow-2" : "rounded-xl shadow-1",
          size === "lg" ? "pl-4" : "pl-3",
        )}
      >
        <span className="hidden font-mono text-sm text-ink-3 sm:inline">https://</span>
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
      {err && <p className="mt-2 text-sm text-accent-ink">{err}</p>}
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
              className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", view === v.key ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
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

      <div className="grid-bg rounded-2xl border border-line bg-surface-2/40 p-5 sm:p-8">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[12px_12px_12px_2px] bg-brand text-xs font-semibold text-white">3</span>
          <span className="font-medium">Primary CTA colour doesn&apos;t match the design</span>
        </div>
        {view === "designer" && (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[13px]">
            {[
              ["font", "DM Sans 700"],
              ["size / lh", "16px / 24px"],
              ["color", "#FFFFFF"],
              ["background", "#1A9AA6 ≠ #0E7C86"],
              ["contrast", "3.38 : 1  fails AA"],
              ["padding", "15 26 15 26"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-dashed border-line py-1">
                <dt className="text-ink-3">{k}</dt>
                <dd className={cn("text-right", v.includes("≠") && "text-accent-ink")}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {view === "developer" && (
          <div className="mt-4 space-y-3 font-mono text-[12.5px]">
            <div className="rounded-lg bg-surface-2 p-3">
              <span className="text-ink-3">selector </span>
              <span className="text-blue">#hero-cta</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-ink-2">
              <div>Chrome 131 · macOS 14.5</div>
              <div>1280×800 @2x</div>
            </div>
            <div className="rounded-lg border border-brand/30 bg-accent-soft p-3 text-accent-ink">
              ✕ GET /api/cart 404 (Not Found)
              <br />✕ Uncaught TypeError: price is undefined @ cart.js:42
            </div>
          </div>
        )}
        {view === "client" && (
          <div className="mt-4 space-y-3 text-sm">
            <Bubble who="Jordan (client)" text="The button looks darker than in the mockup we approved." />
            <Bubble who="Maya" text="Good catch. The token was out of date. Fixed on staging, can you take a look?" me />
            <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--st-verified)_12%,transparent)] px-3 py-2 text-[13px] font-medium text-[var(--st-verified)]">
              ✓ Jordan signed off · Verified
            </div>
          </div>
        )}
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

/* ── Design overlay slider ── */
export function OverlayDemo() {
  const [v, setV] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || touched.current) return;
        io.disconnect();
        // 50 → 12 → 88 → 50 over ~3.2s: shows design vs build drift, then rests in the middle
        const keys = [50, 12, 88, 50];
        const dur = 3200;
        const t0 = performance.now();
        const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
        const tick = (now: number) => {
          if (touched.current) return;
          const p = Math.min(1, (now - t0) / dur);
          const seg = Math.min(keys.length - 2, Math.floor(p * (keys.length - 1)));
          const local = ease(p * (keys.length - 1) - seg);
          setV(Math.round(keys[seg] + (keys[seg + 1] - keys[seg]) * local));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={boxRef} data-reveal className="grid-bg rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-6">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#f3f6f9]">
        {/* build */}
        <MiniHero offset={0} label="BUILD" />
        {/* design, revealed by slider */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}>
          <div className="absolute inset-0 bg-[#f3f6f9]" />
          <MiniHero offset={1} label="DESIGN" />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${v}%` }}>
          <div className="h-full w-px bg-brand" />
          <div className="absolute top-1/2 -ml-3.5 -mt-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-[11px] text-white shadow-2">⇆</div>
        </div>
      </div>
      <input type="range" min={0} max={100} value={v} onPointerDown={() => (touched.current = true)} onChange={(e) => { touched.current = true; setV(+e.target.value); }} className="mt-4 w-full accent-[var(--brand)]" aria-label="Overlay position" />
      <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-3">
        <span>build</span>
        <span>drag to compare</span>
        <span>design</span>
      </div>
    </div>
  );
}

function MiniHero({ offset, label }: { offset: 0 | 1; label: string }) {
  const design = offset === 1;
  return (
    <div className="absolute inset-0 p-[6%]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#10202e" }}>
      <div className="absolute right-3 top-3 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">{label}</div>
      <div className="w-[55%]">
        <div style={{ fontSize: "clamp(14px,3.2vw,30px)", lineHeight: 1.05, fontWeight: 700, letterSpacing: design ? "-0.02em" : "0" }}>
          Coffee roasted <i style={{ color: design ? "#0E7C86" : "#1A9AA6" }}>this week</i>, at your door by Friday.
        </div>
        <div className="mt-[6%] h-2 w-[85%] rounded bg-[#d3dde6]" />
        <div className="mt-2 h-2 w-[70%] rounded bg-[#d3dde6]" />
        <div
          className="mt-[8%] inline-block rounded-md text-white"
          style={{ background: design ? "#0E7C86" : "#1A9AA6", padding: design ? "9px 18px" : "8px 14px", fontSize: 11, fontFamily: "system-ui" }}
        >
          Start a subscription
        </div>
      </div>
      <div
        className="absolute bottom-[10%] right-[6%] top-[14%] w-[34%] rounded-2xl"
        style={{ background: "radial-gradient(circle at 30% 30%,#8fd3d3,#1f6278 60%,#0f2b3c)", transform: design ? "none" : "translateY(6px)" }}
      />
    </div>
  );
}
