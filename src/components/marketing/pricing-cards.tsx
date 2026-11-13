import Link from "next/link";
import { Check, Coffee } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { PLANS } from "@/content/marketing";
import { cn } from "@/lib/utils";

export function PricingCards({ className = "mx-auto max-w-3xl" }: { className?: string }) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)}>
      {PLANS.map((p, k) => (
        <div
          key={p.name}
          data-reveal
          style={{ "--d": k * 90 } as React.CSSProperties}
          className={cn(
            "relative flex flex-col overflow-hidden rounded-2xl border bg-surface p-7 shadow-1",
            p.featured ? "border-brand/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand)_9%,transparent),transparent_42%)]" : "border-line",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            {p.featured && <span className="rounded-full border border-brand/40 px-2.5 py-0.5 text-[11px] font-medium text-brand-ink">Most popular</span>}
          </div>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight">${p.price}</span>
            <span className="text-sm text-ink-3">/mo</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            {p.featured && <Coffee size={15} className="text-brand-ink" aria-hidden />}
            {p.blurb}
          </p>
          <Link href="/app" className={cn(buttonClass(p.featured ? "ink" : "secondary", "md"), "mt-6 w-full")}>
            {p.cta}
          </Link>
          <ul className="mt-6 space-y-3 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check size={16} className={cn("shrink-0", p.featured ? "text-brand-ink" : "text-ink-3")} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
