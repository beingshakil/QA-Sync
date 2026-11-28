"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
