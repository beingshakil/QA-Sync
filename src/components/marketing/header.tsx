"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Briefcase,
  Bug,
  ChevronDown,
  Code2,
  Crosshair,
  Gauge,
  ListChecks,
  Menu,
  Palette,
  PenTool,
  Plug,
  Rocket,
  Ruler,
  ScanSearch,
  Sparkles,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo, buttonClass } from "@/components/ui";
import { PRODUCTS, SOLUTIONS } from "@/content/marketing";
import { cn } from "@/lib/utils";

type MenuKey = "product" | "solutions" | null;
type MenuItem = { href: string; title: string; blurb: string; icon: LucideIcon };
type MenuColumn = { heading: string; items: MenuItem[] };

const productBlurb = (slug: string) => PRODUCTS.find((p) => p.slug === slug)?.menuBlurb ?? "";
const solutionBlurb = (slug: string) => SOLUTIONS.find((s) => s.slug === slug)?.menuBlurb ?? "";

/** Two columns per menu, each item with an icon (EasyQA-style mega menu). */
const MENUS: Record<"product" | "solutions", MenuColumn[]> = {
  product: [
    {
      heading: "Review tools",
      items: [
        { href: "/product/capture", title: "Capture", blurb: productBlurb("capture"), icon: Crosshair },
        { href: "/product/design-qa", title: "Design QA", blurb: productBlurb("design-qa"), icon: Ruler },
        { href: "/product/developer-context", title: "Developer context", blurb: productBlurb("developer-context"), icon: Code2 },
        { href: "/product/monitoring", title: "Audits & monitoring", blurb: productBlurb("monitoring"), icon: Gauge },
      ],
    },
    {
      heading: "Platform",
      items: [
        { href: "/product/ai-agents", title: "AI & agents", blurb: "Claude, ChatGPT and Codex, with verified fixes", icon: Bot },
        { href: "/integrations", title: "Integrations", blurb: "Jira, Linear, GitHub, Slack and more", icon: Plug },
        { href: "/changelog", title: "What's new", blurb: "Every release, newest first", icon: Sparkles },
        { href: "/app", title: "Start reviewing", blurb: "Paste a URL and pin your first comment", icon: ArrowUpRight },
      ],
    },
  ],
  solutions: [
    {
      heading: "By team",
      items: [
        { href: "/solutions/designers", title: "Designers", blurb: solutionBlurb("designers"), icon: PenTool },
        { href: "/solutions/agencies", title: "Agencies", blurb: solutionBlurb("agencies"), icon: Briefcase },
        { href: "/solutions/developers", title: "Developers", blurb: solutionBlurb("developers"), icon: Code2 },
        { href: "/solutions/qa-teams", title: "QA teams", blurb: solutionBlurb("qa-teams"), icon: ListChecks },
        { href: "/solutions/product-teams", title: "Product teams", blurb: solutionBlurb("product-teams"), icon: Rocket },
      ],
    },
    {
      heading: "By use case",
      items: [
        { href: "/solutions/agencies", title: "Client approval", blurb: "Sign-off on the real page", icon: BadgeCheck },
        { href: "/product/design-qa", title: "Design feedback", blurb: "Check the build against the design", icon: Palette },
        { href: "/product/developer-context", title: "Bug reports", blurb: "Every report ready to reproduce", icon: Bug },
        { href: "/product/monitoring", title: "Website QA", blurb: "Links, accessibility and SEO, scored", icon: ScanSearch },
        { href: "/product/ai-agents", title: "AI-assisted fixes", blurb: "Agents fix it, QASync verifies it", icon: Wand2 },
      ],
    },
  ],
};

export function Header() {
  const [open, setOpen] = useState<MenuKey>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(null), setMobile(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enter = (k: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(k);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };

  return (
    <header className={cn("sticky top-0 z-50 transition-colors", scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />
        <nav className="relative hidden items-center gap-1 text-[14px] text-ink-2 md:flex" onMouseLeave={leave}>
          <MenuTrigger label="Product" k="product" open={open} enter={enter} />
          <MenuTrigger label="Solutions" k="solutions" open={open} enter={enter} />
          <NavLink href="/integrations">Integrations</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>

          {open && (
            <div
              key={open}
              role="menu"
              onMouseEnter={() => enter(open)}
              className="animate-pop absolute left-0 top-[calc(100%+10px)] grid w-[640px] grid-cols-2 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-surface/95 p-2 shadow-2 backdrop-blur-md"
            >
              {MENUS[open].map((col) => (
                <div key={col.heading} className="px-2 py-2">
                  <div className="px-3 pb-2 pt-1 text-[12px] font-medium text-ink-3">{col.heading}</div>
                  {col.items.map((item) => (
                    <MegaItem key={item.title} item={item} onClick={() => setOpen(null)} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-sm font-medium text-ink transition hover:border-ink-3 hover:bg-surface-2"
          >
            Sign in
          </Link>
        </div>
        <button className="ml-auto rounded-md p-2 md:hidden" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile((v) => !v)}>
          {mobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobile && (
        <div className="animate-pop max-h-[80vh] overflow-y-auto border-t border-line bg-paper px-4 pb-6 md:hidden">
          {[...MENUS.product, ...MENUS.solutions].map((col) => (
            <div key={col.heading} className="border-b border-line py-3">
              <div className="mb-1 px-1 text-[12px] font-medium text-ink-3">{col.heading}</div>
              <div className="grid grid-cols-2 gap-x-2">
                {col.items.map((item) => (
                  <Link key={item.title} href={item.href} onClick={() => setMobile(false)} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-[14px] text-ink-2 hover:text-ink">
                    <item.icon size={15} className="shrink-0 text-brand-ink" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-4 py-3 text-[14px] text-ink-2">
            <Link href="/integrations" onClick={() => setMobile(false)}>Integrations</Link>
            <Link href="/pricing" onClick={() => setMobile(false)}>Pricing</Link>
          </div>
          <Link href="/login" onClick={() => setMobile(false)} className={buttonClass("secondary", "md", "mt-2 w-full")}>
            Sign in
          </Link>
        </div>
      )}
    </header>
  );
}

function MenuTrigger({ label, k, open, enter }: { label: string; k: MenuKey; open: MenuKey; enter: (k: MenuKey) => void }) {
  return (
    <button
      className={cn("flex items-center gap-1 rounded-lg px-3 py-2 transition hover:text-ink", open === k && "bg-surface-2 text-ink")}
      onMouseEnter={() => enter(k)}
      onClick={() => enter(open === k ? null : k)}
      aria-expanded={open === k}
      aria-haspopup="menu"
    >
      {label}
      <ChevronDown size={14} className={cn("transition-transform", open === k && "rotate-180")} />
    </button>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 transition hover:bg-surface-2/60 hover:text-ink">
      {children}
    </Link>
  );
}

function MegaItem({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClick} role="menuitem" className="group flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2">
      <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-ink transition group-hover:scale-110" />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{item.title}</span>
        <span className="block truncate text-[12.5px] text-ink-3">{item.blurb}</span>
      </span>
    </Link>
  );
}

