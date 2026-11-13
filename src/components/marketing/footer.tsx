import Link from "next/link";
import { Logo } from "@/components/ui";
import { PRODUCTS, SOLUTIONS } from "@/content/marketing";
import { BRAND } from "@/lib/brand";

export function Footer() {
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    { title: "Product", links: PRODUCTS.map((p) => ({ href: `/product/${p.slug}`, label: p.name })) },
    { title: "Solutions", links: SOLUTIONS.map((s) => ({ href: `/solutions/${s.slug}`, label: `For ${s.name.replace(/^\w/, (c) => c.toLowerCase())}` })) },
    {
      title: "Company",
      links: [
        { href: "/pricing", label: "Pricing" },
        { href: "/integrations", label: "Integrations" },
        { href: "/changelog", label: "Changelog" },
      ],
    },
    {
      title: "Try it",
      links: [
        { href: "/app", label: "Open the app" },
        { href: "/app/projects", label: "Your projects" },
      ],
    },
  ];
  return (
    <footer className="border-t border-line bg-paper">
      <div className="hairline-grad" />
      <div className="ruler-x opacity-40" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-3">{BRAND.description}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">{c.title}</div>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-6 text-xs text-ink-3">
          <span>© 2026 {BRAND.name}. Phase 1 preview.</span>
          <span className="font-mono">v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
