import Link from "next/link";
import { Logo } from "@/components/ui";
import { PRODUCTS, SOLUTIONS } from "@/content/marketing";
import { BRAND } from "@/lib/brand";

export function Footer() {
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    { title: "Product", links: PRODUCTS.map((p) => ({ href: `/product/${p.slug}`, label: p.name })) },
    { title: "Solutions", links: SOLUTIONS.map((s) => ({ href: `/solutions/${s.slug}`, label: `For ${s.name.replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase())}` })) },
    {
      title: "Company",
      links: [
        { href: "/pricing", label: "Pricing" },
        { href: "/integrations", label: "Integrations" },
        { href: "/changelog", label: "Changelog" },
      ],
    },
  ];
  return (
    // The links in a card, the same width and inner padding as the CTA card above it.
    <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 md:pb-16">
      <div className="rounded-3xl border border-line bg-surface px-6 py-10 sm:px-10 md:px-16 md:py-14">
        <div className="grid gap-12 md:grid-cols-[1.25fr_2fr] md:gap-16">
          <div>
            <Logo />
            <p className="mt-4 max-w-[24rem] text-pretty text-[14px] leading-relaxed text-ink-3">{BRAND.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <div className="text-[14px] font-semibold text-ink">{c.title}</div>
                <ul className="mt-3 space-y-0.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-flex min-h-7 items-center text-[14px] text-ink-3 transition-colors hover:text-ink max-sm:min-h-10">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 {BRAND.name}. Phase 1 preview. <span className="tabular-nums">v0.1.0</span>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="inline-flex min-h-6 items-center underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-3 max-sm:min-h-10">
              Privacy Policy
            </Link>
            <Link href="/terms" className="inline-flex min-h-6 items-center underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-3 max-sm:min-h-10">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
