import type { ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Link2,
  MessageSquarePlus,
  Monitor,
  MousePointer2,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Tablet,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/ui";
import { cn } from "@/lib/utils";
import { d } from "./sections";
import { ProductTile } from "./demo-art";

/* Palette for the demo site (a coffee roaster) so it reads as "someone else's website". */
const NW = { bg: "#f3f6f9", ink: "#10202e", muted: "#52616e", brand: "#1A9AA6" };
const PIN = { critical: "#ef4444", medium: "#f97316", verified: "#16a34a" };

function Pin({ children, color, className }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span
      className={cn("absolute flex h-7 w-7 items-center justify-center rounded-[14px_14px_14px_3px] font-sans text-[12px] font-semibold text-white shadow-2 ring-2 ring-white", className)}
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

/* ───────── Hero: the review canvas, fully populated, with the pin → fix → verify story on top ───────── */

export function ProductShot() {
  return (
    <div data-reveal style={d(220)} className="relative">
      <div className="story relative overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_50px_120px_-40px_rgb(0_0_0/0.55)]">
        {/* app toolbar */}
        <div className="flex h-12 items-center gap-3 border-b border-line bg-surface px-3.5">
          <LogoMark className="h-6 w-6" />
          <span className="hidden text-[13px] font-medium text-ink sm:inline">northwind.coffee</span>
          <div className="ml-1 flex h-7 min-w-0 max-w-[320px] flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-2.5 font-mono text-[11.5px] text-ink-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pass" />
            <span className="truncate">https://northwind.coffee/</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ToolGroup className="hidden lg:flex">
              <ToolIcon active>
                <Monitor size={14} />
              </ToolIcon>
              <ToolIcon>
                <Tablet size={14} />
              </ToolIcon>
              <ToolIcon>
                <Smartphone size={14} />
              </ToolIcon>
            </ToolGroup>
            <ToolGroup className="hidden sm:flex">
              <ToolIcon>
                <MousePointer2 size={14} />
              </ToolIcon>
              <ToolIcon active dark>
                <MessageSquarePlus size={14} />
              </ToolIcon>
              <ToolIcon>
                <ScanSearch size={14} />
              </ToolIcon>
            </ToolGroup>
            <span className="flex h-7 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-medium text-white">
              <Link2 size={13} /> Share
            </span>
          </div>
        </div>

        <div className="relative grid md:grid-cols-[1fr_340px]">
          {/* the site under review */}
          <div className="relative min-h-[400px] overflow-hidden p-7 sm:p-10" style={{ background: NW.bg, color: NW.ink }}>
            <div className="flex items-center justify-between text-[12px]" style={{ color: NW.muted }}>
              <span className="text-[15px] font-bold" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", color: NW.ink }}>
                ● Northwind
              </span>
              <span className="relative hidden gap-5 sm:flex">
                <span>Shop</span>
                <span className="relative">
                  Subscriptions
                  <Pin color={PIN.medium} className="-right-6 -top-5 scale-[0.85]">
                    2
                  </Pin>
                </span>
                <span>Our story</span>
              </span>
            </div>

            <div className="relative mt-10 max-w-[64%] sm:mt-12">
              {/* The demo site's headline: a div, not a heading of this page */}
              <div className="text-[30px] font-bold leading-[1.04] sm:text-[40px]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.01em" }}>
                Coffee roasted <i style={{ color: NW.brand }}>this week</i>, at your door by Friday.
              </div>
              <Pin color={PIN.critical} className="z-10 right-0 -top-5">
                1
              </Pin>
              <p className="mt-4 max-w-[30ch] text-[13.5px] leading-relaxed" style={{ color: NW.muted }}>
                Small-batch beans from three farms we visit every year.
              </p>
              <div className="relative mt-6 inline-block">
                <div className="rounded-md px-4 py-2.5 text-[12.5px] font-semibold text-white" style={{ background: NW.brand }}>
                  Start a subscription
                </div>
                {/* hover outline + measurement, as the cursor arrives */}
                <div className="story-outline pointer-events-none absolute -inset-1 rounded-lg outline outline-[1.5px] outline-[#5b86f2]">
                  <div className="absolute -bottom-6 left-0 right-0 flex items-center gap-1 font-mono text-[10px] text-[#5b86f2]">
                    <span className="h-px flex-1 bg-[#5b86f2]" />
                    184px
                    <span className="h-px flex-1 bg-[#5b86f2]" />
                  </div>
                </div>
                <span className="story-pin absolute -right-4 -top-6 h-7 w-7 rounded-[14px_14px_14px_3px] text-[12px] font-semibold text-white shadow-2 ring-2 ring-white">
                  <span className="story-pin-num">3</span>
                  <span className="story-pin-check">✓</span>
                </span>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 top-24 hidden w-[28%] sm:block">
              <ProductTile className="h-full" />
              <Pin color={PIN.verified} className="-left-3 bottom-16">
                ✓
              </Pin>
            </div>
          </div>

          {/* comments panel: always populated */}
          <aside className="hidden flex-col border-l border-line bg-surface md:flex">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="text-[13px] font-semibold text-ink">
                Comments <span className="font-normal text-ink-3">· Home</span>
              </div>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">4</span>
            </div>
            <div className="px-4 pt-3">
              <div className="flex justify-between text-[11.5px] text-ink-3">
                <span>Page progress</span>
                <span>2 of 4 resolved</span>
              </div>
              <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-surface-2">
                <span className="w-1/4 bg-pass" />
                <span className="w-1/4 bg-[var(--st-fixed)] opacity-80" />
              </div>
              <div className="mt-1.5 flex gap-3 text-[10.5px] text-ink-3">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--st-fixed)]" /> Fixed
                </span>
              </div>
            </div>
            <ul className="space-y-2 p-3 text-[12.5px]">
              <IssueRow n="1" color={PIN.critical} title="Headline wraps badly on iPhone 15" meta="iPhone 15 · Maya" status="Open" />
              <IssueRow n="2" color={PIN.medium} title="Nav links sit 4px too low" meta="Desktop · Jordan" status="In review" />
              <li className="rounded-xl border border-brand/40 bg-brand-soft/40 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="story-dot relative mt-0.5 h-5 w-5 shrink-0 rounded-full text-[10px] font-semibold text-white">
                    <span className="story-pin-num">3</span>
                    <span className="story-pin-check">✓</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug text-ink">Button colour doesn&apos;t match the design</div>
                    <div className="mt-1.5 rounded-md bg-surface-2 px-2 py-1 font-mono text-[10.5px] text-ink-2">
                      bg <span className="text-accent-ink">#1A9AA6</span> → design <span className="text-ink">#0E7C86</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-ink-2">
                      <span className="font-medium text-ink">Maya</span> The token looks out of date.
                    </div>
                    <div className="story-reply mt-1 text-[11.5px] text-ink-2">
                      <span className="font-medium text-ink">Arjun</span> Updated it. It&apos;s on staging.
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between pl-[30px]">
                  <span className="story-status rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] font-medium">
                    <span className="story-s-open text-[var(--st-open)]">● Open</span>
                    <span className="story-s-fixed text-[var(--st-fixed)]">● Fixed</span>
                    <span className="story-s-verified text-pass">✓ Verified</span>
                  </span>
                  <span data-target="mark-fixed" className="rounded-md bg-ink px-2 py-1 text-[10.5px] font-medium text-paper">
                    Mark fixed
                  </span>
                </div>
              </li>
              <IssueRow n="✓" color={PIN.verified} title="Product photo is soft on retina" meta="Desktop · Client" status="Verified" done />
            </ul>
          </aside>

          {/* verified toast */}
          <div className="story-toast absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink shadow-2 md:left-[calc((100%-340px)/2)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-[11px] text-white">✓</span>
            Fix verified on the live page
          </div>

          <MousePointer2 aria-hidden size={20} className="story-cursor hidden fill-[#0b0f1a] text-white drop-shadow md:block" />
        </div>
      </div>
    </div>
  );
}

function ToolGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5", className)}>{children}</div>;
}

function ToolIcon({ children, active, dark }: { children: ReactNode; active?: boolean; dark?: boolean }) {
  return (
    <span className={cn("flex h-6 w-7 items-center justify-center rounded-md", active ? (dark ? "bg-ink text-paper" : "bg-brand text-white") : "text-ink-3")}>{children}</span>
  );
}

function IssueRow({ n, color, title, meta, status, done }: { n: string; color: string; title: string; meta: string; status: string; done?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: color }}>
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium", done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink")}>{title}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-ink-3">
          <span className="truncate">{meta}</span>
          <span className={cn("shrink-0", done && "text-pass")}>{status}</span>
        </div>
      </div>
    </li>
  );
}

/* ───────── How it works: the four statuses an issue moves through ───────── */

const STEPS = [
  { n: "01", status: "Open", color: "var(--st-open)", t: "Pin it", b: "Click any element on the live page. The pin keeps its selector, styles, screen size and console errors." },
  { n: "02", status: "In review", color: "var(--st-review)", t: "Talk it through", b: "Teammates and clients reply on the pin. @mention someone to hand it over." },
  { n: "03", status: "Fixed", color: "var(--st-fixed)", t: "Fix it", b: "A developer, or an AI agent over MCP, ships the change with everything it needs in the issue." },
  { n: "04", status: "Verified", color: "var(--pass)", t: "Verify it", b: "Whoever reported it checks the live page and marks it Verified, or reopens it with a note." },
];

export function HowItWorks() {
  return (
    <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.n} data-reveal style={d(i * 110)} className="flex flex-col bg-surface p-6 md:p-7">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] text-ink-3">{s.n}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium" style={{ color: s.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.status}
            </span>
          </div>
          <h3 className="mt-10 text-[18px] font-semibold tracking-[-0.015em] text-ink">{s.t}</h3>
          <p className="mt-2 text-pretty text-[14.5px] leading-[1.65] text-ink-2">{s.b}</p>
        </li>
      ))}
    </ol>
  );
}

/* ───────── Canvas bento ───────── */

export function BentoCard({ title, body, visual, className, delay = 0 }: { title: string; body: string; visual: ReactNode; className?: string; delay?: number }) {
  return (
    <div data-reveal style={d(delay)} className={cn("flex flex-col overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      <div className="relative flex min-h-[188px] flex-1 items-center justify-center border-b border-line bg-surface-2/60 p-6">{visual}</div>
      <div className="p-6">
        <h3 className="text-[16.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <p className="mt-1.5 text-pretty text-[14.5px] leading-[1.6] text-ink-2">{body}</p>
      </div>
    </div>
  );
}

export function SpecVisual() {
  const rows: [string, string, boolean?][] = [
    ["font", "Inter 600"],
    ["size / line", "15px / 22px"],
    ["padding", "12 20 12 20"],
    ["background", "#1A9AA6 ≠ #0E7C86", true],
    ["contrast", "3.38 : 1 · fails AA"],
  ];
  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <div className="rounded-md px-5 py-3 text-[13px] font-semibold text-white" style={{ background: NW.brand }}>
          Start a subscription
        </div>
        <div className="pointer-events-none absolute -inset-1.5 rounded-lg border-[1.5px] border-dashed border-[#5b86f2]" />
        <div className="absolute -bottom-7 left-0 right-0 flex items-center gap-1 font-mono text-[10px] text-[#5b86f2]">
          <span className="h-px flex-1 bg-[#5b86f2]" />
          184px
          <span className="h-px flex-1 bg-[#5b86f2]" />
        </div>
      </div>
      <dl className="w-full flex-1 rounded-xl border border-line bg-surface p-3 font-mono text-[11.5px] shadow-1">
        {rows.map(([k, v, diff]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line py-1.5 last:border-0">
            <dt className="text-ink-3">{k}</dt>
            <dd className={cn("text-right", diff ? "text-accent-ink" : "text-ink")}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function FreezeVisual() {
  return (
    <div className="relative w-full max-w-[220px]">
      <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-ink shadow-1">
        Services <ChevronDown size={14} className="text-ink-3" />
      </div>
      <div className="mt-1.5 rounded-lg border border-line bg-surface p-1 text-[12px] text-ink-2 shadow-2">
        {["Brand design", "Web design", "Product design"].map((t, i) => (
          <div key={t} className={cn("rounded-md px-2.5 py-1.5", i === 1 && "bg-brand-soft text-ink")}>
            {t}
          </div>
        ))}
      </div>
      <span className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full border border-[#5b86f2]/40 bg-surface px-2 py-0.5 text-[11px] font-medium text-[#5b86f2] shadow-1">
        <Snowflake size={11} /> Frozen
      </span>
      <span className="absolute -bottom-3 -left-2 flex h-7 w-7 items-center justify-center rounded-md border border-line-strong bg-surface font-mono text-[12px] font-semibold text-ink shadow-1">F</span>
    </div>
  );
}

export function DevicesVisual() {
  const frame = (w: number, h: number, label: string) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col gap-1 rounded-md border border-line-strong bg-surface p-1.5 shadow-1" style={{ width: w, height: h }}>
        <span className="h-1 w-1/2 rounded bg-line-strong" />
        <span className="mt-1 h-1.5 w-4/5 rounded bg-ink-3/40" />
        <span className="h-1.5 w-3/5 rounded bg-ink-3/40" />
        <span className="mt-auto h-2.5 w-2/5 rounded-sm" style={{ background: NW.brand }} />
      </div>
      <span className="font-mono text-[10px] text-ink-3">{label}</span>
    </div>
  );
  return (
    <div className="flex items-end gap-4">
      {frame(124, 82, "1440")}
      {frame(62, 82, "820")}
      {frame(38, 70, "393")}
    </div>
  );
}

export function PagesVisual() {
  const rows: [string, string, string][] = [
    ["/", "Passed", "var(--pass)"],
    ["/pricing", "Ready", "var(--st-fixed)"],
    ["/about", "In review", "#f97316"],
    ["/blog", "Not reviewed", "var(--ink-3)"],
  ];
  return (
    <ul className="w-full max-w-[240px] divide-y divide-line rounded-xl border border-line bg-surface text-[12px] shadow-1">
      {rows.map(([p, s, c]) => (
        <li key={p} className="flex items-center justify-between px-3 py-2">
          <span className="font-mono text-ink-2">{p}</span>
          <span className="flex items-center gap-1.5 font-medium" style={{ color: c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
            {s}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ShareVisual() {
  return (
    <div className="w-full max-w-[250px] space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-3 pr-1.5 shadow-1">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-2">qasync.app/r/7Kf2…/pricing</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-ink-3">
          <Copy size={12} />
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 shadow-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f97316] text-[11px] font-semibold text-white">J</span>
        <div className="text-[12px] leading-tight">
          <div className="font-medium text-ink">Jordan</div>
          <div className="text-ink-3">Guest · no account</div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Audit report preview ───────── */

export function AuditPreview() {
  const rows: { label: string; pass: boolean; badge: string }[] = [
    { label: "Meta title", pass: true, badge: "57 characters" },
    { label: "Meta description", pass: true, badge: "158 characters" },
    { label: "Heading structure", pass: true, badge: "1 H1, in order" },
    { label: "Image alt text", pass: false, badge: "11 without alt" },
    { label: "Canonical tag", pass: true, badge: "Self-referencing" },
    { label: "Open Graph tags", pass: true, badge: "Complete" },
  ];
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div data-reveal className="rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-6">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2">
        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <div className="relative h-[64px] w-[64px] shrink-0">
            <svg width="64" height="64" className="-rotate-90" aria-hidden>
              <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle cx="32" cy="32" r={r} fill="none" stroke="var(--pass)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.08} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-ink">92</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-ink">
              SEO score <span className="font-normal text-ink-3">· 11 of 12 passed</span>
            </div>
            <div className="mt-2.5 flex gap-1" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i === 11 ? "bg-danger" : "bg-pass")} />
              ))}
            </div>
          </div>
        </div>
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.label} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-medium text-ink">{row.label}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium", row.pass ? "bg-pass-soft text-pass" : "bg-danger-soft text-danger")}>
                  {row.pass ? <Check size={12} strokeWidth={2.75} /> : <X size={12} strokeWidth={2.75} />}
                  {row.badge}
                </span>
              </div>
              {!row.pass && <p className="mt-2 rounded-md bg-danger-soft px-2.5 py-1.5 text-[12px] text-danger">Add alt text to the 11 images that need it: describe what each one shows.</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────── Agent terminal ───────── */

export function AgentTerminal() {
  const line = "text-[#9aa4bb]";
  return (
    <div data-reveal className="overflow-hidden rounded-2xl border border-line-strong bg-[#070a12] font-mono text-[12.5px] leading-[1.75] text-[#e6e9f2] shadow-2">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-[11px] text-white/45">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="ml-2">claude · connected to qasync</span>
      </div>
      <div className="space-y-0.5 p-5">
        <p data-reveal style={d(150)}>
          <span className="text-white/40">›</span> Fix the open QASync issues on northwind.coffee
        </p>
        <p data-reveal style={d(500)} className={cn("pt-2", line)}>
          <span className="text-[#7aa2ff]">list_issues</span> project: northwind · <span className="text-white">3 open</span>
        </p>
        <p data-reveal style={d(800)} className={line}>
          <span className="text-[#7aa2ff]">get_issue</span> #3 · <span className="text-white">#hero-cta</span> · bg #1A9AA6 · contrast 3.38
        </p>
        <p data-reveal style={d(1100)} className={line}>
          edited <span className="text-white">styles/tokens.css</span>, <span className="text-white">components/Hero.tsx</span>
        </p>
        <p data-reveal style={d(1400)} className={line}>
          <span className="text-[#7aa2ff]">reply_to_issue</span> #3 “Brand token updated to #0E7C86, contrast 4.95”
        </p>
        <p data-reveal style={d(1700)} className={line}>
          <span className="text-[#7aa2ff]">update_issue</span> #1 #2 #3 → <span className="text-white">fixed</span>
        </p>
        <p data-reveal style={d(2100)} className="pt-2">
          <span className="text-[#4ade80]">✓ 3 issues marked fixed</span> <span className="text-white/45">· waiting for you to verify</span>
        </p>
      </div>
    </div>
  );
}

/* ───────── Trust ───────── */

export const TRUST = [
  { icon: ShieldCheck, t: "Sandboxed pages", b: "Sites load in an isolated sandbox with no access to your QASync session or cookies." },
  { icon: Link2, t: "Scoped share links", b: "A link opens one project. Guests can edit or delete only what they wrote." },
  { icon: KeyRound, t: "Revocable agent tokens", b: "AI tokens are stored hashed, shown once, and stop working the moment you revoke them." },
] as const;
