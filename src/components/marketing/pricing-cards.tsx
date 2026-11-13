"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { PLANS } from "@/content/marketing";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function PricingCards() {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-xl border border-line bg-surface p-1 text-sm shadow-1">
          <button onClick={() => setAnnual(false)} className={cn("rounded-lg px-4 py-1.5", !annual ? "bg-ink text-paper" : "text-ink-2")}>
            Monthly
          </button>
          <button onClick={() => setAnnual(true)} className={cn("flex items-center gap-2 rounded-lg px-4 py-1.5", annual ? "bg-ink text-paper" : "text-ink-2")}>
            Annual <span className="rounded bg-grad-brand px-1.5 py-px text-[10px] font-semibold text-white">−20%</span>
          </button>
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const price = annual ? p.price.annual : p.price.monthly;
          return (
            <div key={p.name} data-reveal style={{ "--d": PLANS.indexOf(p) * 90 } as React.CSSProperties} className={cn("flex flex-col rounded-2xl border p-6", p.featured ? "ring-grad glow-brand border-transparent bg-[#0b1024] text-white" : "lift border-line bg-surface shadow-1")}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-grad-brand px-2 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              </div>
              <p className={cn("mt-1 text-sm", p.featured ? "text-white/70" : "text-ink-3")}>{p.blurb}</p>
              <div className="mt-5 h-12 text-4xl font-semibold tracking-tight">
                {price === null ? "Custom" : `$${price}`}
                {price !== null && price > 0 && <span className={cn("text-sm font-normal", p.featured ? "text-white/60" : "text-ink-3")}> /mo</span>}
              </div>
              <div className={cn("h-5 text-xs", p.featured ? "text-white/50" : "text-ink-3")}>{price && annual ? "billed annually" : ""}</div>
              <Link href="/app" className={cn(buttonClass(p.featured ? "primary" : "secondary", "md"), "mt-5 w-full")}>
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={p.featured ? "text-[#bc8fd6]" : "text-accent-ink"}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
