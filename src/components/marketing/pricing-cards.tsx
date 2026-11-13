import Link from "next/link";
import { Check, Coffee } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { PLANS } from "@/content/marketing";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
      {PLANS.map((p, k) => (
        <div
          key={p.name}
          data-reveal
          style={{ "--d": k * 90 } as React.CSSProperties}
          className={cn("flex flex-col rounded-2xl border p-7", p.featured ? "ring-grad glow-brand border-transparent bg-[#0b1024] text-white" : "lift border-line bg-surface shadow-1")}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            {p.featured && <span className="rounded-full bg-grad-brand px-2.5 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
          </div>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight">${p.price}</span>
            <span className={cn("text-sm", p.featured ? "text-white/60" : "text-ink-3")}>/mo</span>
          </div>
          <p className={cn("mt-2 flex items-center gap-1.5 text-sm", p.featured ? "text-white/75" : "text-ink-3")}>
            {p.featured && <Coffee size={15} className="text-[#bc8fd6]" aria-hidden />}
            {p.blurb}
          </p>
          <Link href="/app" className={cn(buttonClass(p.featured ? "primary" : "secondary", "md"), "mt-6 w-full")}>
            {p.cta}
          </Link>
          <ul className="mt-6 space-y-3 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check size={16} className={cn("shrink-0", p.featured ? "text-[#bc8fd6]" : "text-accent-ink")} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
