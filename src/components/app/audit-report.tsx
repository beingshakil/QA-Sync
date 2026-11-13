"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Braces,
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  ExternalLink,
  Globe,
  Heading1,
  ImageIcon,
  ImageOff,
  Info,
  Languages,
  Link2,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  ScanSearch,
  Search,
  Share2,
  TextQuote,
  Type,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Audit, AuditFinding, Project, SeoLink, SeoReport } from "@/lib/types";
import { headingCounts, headingSkip, isBroken, linkState, OG_REQUIRED, seoChecks, type SeoCheck, type SeoCheckId, type SeoTab } from "@/lib/seo-checks";
import { Button } from "@/components/ui";
import { DeleteAuditButton } from "./delete-audit-button";
import { cn } from "@/lib/utils";

const ICONS: Record<SeoCheckId, typeof Type> = {
  title: Type,
  description: TextQuote,
  headings: Heading1,
  images: ImageIcon,
  internal: Link2,
  external: ExternalLink,
  url: Globe,
  indexable: ScanSearch,
  canonical: Crosshair,
  schema: Braces,
  og: Share2,
  lang: Languages,
};

type Tab = SeoTab | "other";

/** Popup mode (review canvas): no back link, re-run swaps the report in place, and a close button. */
export interface EmbeddedReport {
  onRerun: (a: Audit) => void;
  onClose: () => void;
}

export function AuditReport({ audit, project, initialTab, embedded }: { audit: Audit; project: Project; initialTab?: string; embedded?: EmbeddedReport }) {
  const seo = audit.seo;
  const checks = useMemo(() => (seo ? seoChecks(seo) : []), [seo]);
  const failing = checks.filter((c) => !c.pass);
  const [tab, setTab] = useState<Tab>(seo ? ((initialTab as Tab) ?? "overview") : "other");

  const failTabs = new Set(failing.map((c) => c.tab).filter(Boolean));
  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = seo
    ? [
        { id: "overview", label: "Overview", alert: failing.length > 0 },
        { id: "headings", label: "Headings", count: seo.headings.length, alert: failTabs.has("headings") },
        { id: "links", label: "Links", count: seo.links.internal.length + seo.links.external.length, alert: failTabs.has("links") },
        { id: "images", label: "Images", count: seo.images.length, alert: failTabs.has("images") },
        { id: "schema", label: "Schema", count: seo.schema.length, alert: failTabs.has("schema") },
        { id: "social", label: "Social", alert: failTabs.has("social") },
        { id: "other", label: "Other checks", count: audit.findings.length },
      ]
    : [{ id: "other", label: "Checks", count: audit.findings.length }];

  function go(t: Tab) {
    setTab(t);
    if (embedded) return;
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  }

  return (
    <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", embedded ? "pb-8 pt-5" : "py-6 sm:py-8")}>
      <Header audit={audit} project={project} embedded={embedded} />

      {seo ? (
        <Summary checks={checks} onPick={(c) => go(c.tab ?? "overview")} />
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-1">
          <Info size={18} className="shrink-0 text-brand" />
          <p className="min-w-0 flex-1 text-[14px] text-ink-2">This audit ran before the SEO report existed. Re-run it to see titles, headings, links, images, schema and Open Graph.</p>
          <RerunButton audit={audit} embedded={embedded} />
        </div>
      )}

      {/* Tabs */}
      <div className={cn("sticky top-0 z-10 mt-6 border-b border-line backdrop-blur", embedded ? "bg-paper/95" : "bg-paper/90")}>
        <nav className="no-scrollbar -mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Report sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => go(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[14px] transition",
                tab === t.id ? "border-brand font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="rounded-md bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink-3">{t.count}</span>}
              {t.alert && <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-label="has problems" />}
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-in-up mt-6" key={tab}>
        {seo && tab === "overview" && <Overview checks={checks} onOpen={(t) => go(t)} />}
        {seo && tab === "headings" && <HeadingsTab seo={seo} />}
        {seo && tab === "links" && <LinksTab seo={seo} />}
        {seo && tab === "images" && <ImagesTab seo={seo} />}
        {seo && tab === "schema" && <SchemaTab seo={seo} />}
        {seo && tab === "social" && <SocialTab seo={seo} />}
        {tab === "other" && <OtherChecks audit={audit} project={project} />}
      </div>
    </div>
  );
}

/* ───────── Header & summary ───────── */

function Header({ audit, project, embedded }: { audit: Audit; project: Project; embedded?: EmbeddedReport }) {
  const when = new Date(audit.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        {embedded ? (
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">SEO audit report</div>
        ) : (
          <Link href="/app/audits" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
            <ArrowLeft size={14} /> Audits
          </Link>
        )}
        <h1 className="mt-2 line-clamp-2 text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">{audit.seo?.title || project.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <a href={audit.seo?.finalUrl ?? audit.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[12.5px] text-ink-2 hover:text-brand">
            <Globe size={13} className="shrink-0" />
            <span className="truncate">{audit.seo?.finalUrl ?? audit.url}</span>
          </a>
          <span suppressHydrationWarning>Audited {when}</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        {audit.seo && <RerunButton audit={audit} embedded={embedded} />}
        {!embedded && <DeleteAuditButton id={audit.id} url={audit.url} redirectTo="/app/audits" withLabel />}
        {embedded && (
          <>
            <Link
              href={`/app/audits/${audit.id}`}
              title="Open as a full page"
              aria-label="Open as a full page"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 shadow-1 hover:border-line-strong hover:text-ink"
            >
              <ExternalLink size={16} />
            </Link>
            <button
              onClick={embedded.onClose}
              title="Close (Esc)"
              aria-label="Close audit report"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 shadow-1 hover:border-line-strong hover:text-ink"
            >
              <X size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RerunButton({ audit, embedded }: { audit: Audit; embedded?: EmbeddedReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function rerun() {
    setBusy(true);
    setErr(null);
    try {
      const a = await api.runAudit(audit.projectId, audit.url);
      if (embedded) {
        embedded.onRerun(a);
        setBusy(false);
      } else router.push(`/app/audits/${a.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={rerun} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {busy ? "Auditing… checking links" : "Re-run audit"}
      </Button>
      {err && <span className="text-[12px] text-danger">{err}</span>}
    </div>
  );
}

function Summary({ checks, onPick }: { checks: SeoCheck[]; onPick: (c: SeoCheck) => void }) {
  const passed = checks.filter((c) => c.pass).length;
  const failing = checks.filter((c) => !c.pass);
  const score = Math.round((passed / checks.length) * 100);
  const color = score >= 85 ? "var(--pass)" : score >= 60 ? "var(--st-progress)" : "var(--danger)";
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="mt-6 grid gap-6 rounded-2xl border border-line bg-surface p-5 shadow-1 sm:p-6 md:grid-cols-[auto_1fr]">
      <div className="flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg width="84" height="84" className="-rotate-90" aria-hidden>
            <circle cx="42" cy="42" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-semibold leading-none tracking-tight">{score}</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-3">/ 100</span>
          </div>
        </div>
        <div className="md:hidden">
          <div className="font-semibold">SEO score</div>
          <div className="text-[13px] text-ink-3">{passed} of {checks.length} checks passed</div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="hidden items-baseline justify-between gap-4 md:flex">
          <div>
            <span className="font-semibold">SEO score</span>
            <span className="ml-2 text-[13px] text-ink-3">{passed} of {checks.length} checks passed</span>
          </div>
        </div>
        {/* Segmented bar: one segment per check */}
        <div className="mt-3 flex gap-1" aria-hidden>
          {[...checks].sort((a, b) => Number(b.pass) - Number(a.pass)).map((ch) => (
            <span key={ch.id} className={cn("h-2 flex-1 rounded-full", ch.pass ? "bg-pass" : "bg-danger")} />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[13px]">
          <span className="inline-flex items-center gap-1.5 text-pass">
            <Check size={14} strokeWidth={2.5} /> {passed} passed
          </span>
          <span className={cn("inline-flex items-center gap-1.5", failing.length ? "text-danger" : "text-ink-3")}>
            <X size={14} strokeWidth={2.5} /> {failing.length} to fix
          </span>
        </div>
        {failing.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {failing.map((f) => (
              <button
                key={f.id}
                onClick={() => (f.tab ? onPick(f) : document.getElementById(`check-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-3 py-1 text-[12.5px] text-danger transition hover:border-danger/50"
              >
                {f.label}: {f.badge}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Overview ───────── */

function Overview({ checks, onOpen }: { checks: SeoCheck[]; onOpen: (t: Tab) => void }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <CheckGroup title="On-page SEO" sub="What visitors and search engines read" checks={checks.filter((c) => c.group === "onpage")} onOpen={onOpen} />
      <CheckGroup title="Technical SEO" sub="How search engines crawl, index and share the page" checks={checks.filter((c) => c.group === "technical")} onOpen={onOpen} />
    </div>
  );
}

function CheckGroup({ title, sub, checks, onOpen }: { title: string; sub: string; checks: SeoCheck[]; onOpen: (t: Tab) => void }) {
  const passed = checks.filter((c) => c.pass).length;
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-[12.5px] text-ink-3">{sub}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-[11.5px]", passed === checks.length ? "bg-pass-soft text-pass" : "bg-surface-2 text-ink-2")}>
          {passed}/{checks.length} passed
        </span>
      </header>
      <ul className="divide-y divide-line">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check: c, onOpen }: { check: SeoCheck; onOpen: (t: Tab) => void }) {
  const Icon = ICONS[c.id];
  return (
    <li id={`check-${c.id}`} className="flex gap-3.5 px-5 py-4">
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", c.pass ? "bg-surface-2 text-ink-2" : "bg-danger-soft text-danger")}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="pt-1.5 text-[14.5px] font-medium leading-tight">{c.label}</h3>
          <StatusPill pass={c.pass}>{c.badge}</StatusPill>
        </div>
        {c.value ? (
          <p className="mt-1.5 line-clamp-2 break-words text-[13.5px] leading-relaxed text-ink-2">{c.value}</p>
        ) : (
          <p className="mt-1.5 text-[13.5px] text-ink-3">Not found on the page</p>
        )}
        {c.meta && <p className="mt-1 font-mono text-[11.5px] text-ink-3">{c.meta}</p>}
        {c.fix && (
          <p className="mt-2.5 flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] leading-snug text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{c.fix}</span>
          </p>
        )}
        {c.tab && (
          <button onClick={() => onOpen(c.tab!)} className="mt-2 inline-flex items-center gap-0.5 text-[12.5px] font-medium text-brand hover:underline">
            View details <ChevronRight size={13} />
          </button>
        )}
      </div>
    </li>
  );
}

function StatusPill({ pass, children }: { pass: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium", pass ? "bg-pass-soft text-pass" : "bg-danger-soft text-danger")}>
      {pass ? <Check size={13} strokeWidth={2.75} /> : <X size={13} strokeWidth={2.75} />}
      {children}
    </span>
  );
}

/* ───────── Headings ───────── */

function HeadingsTab({ seo }: { seo: SeoReport }) {
  const counts = headingCounts(seo);
  const skip = headingSkip(seo);
  const h1 = counts[0];
  const text = seo.headings.map((h) => `${"  ".repeat(h.level - 1)}H${h.level} ${h.text}`).join("\n");
  let prev = 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-1 sm:grid-cols-6">
        {counts.map((n, i) => {
          const bad = i === 0 && n !== 1;
          return (
            <div key={i} className="bg-surface px-4 py-4 text-center">
              <div className={cn("mx-auto inline-flex rounded-md px-2 py-0.5 font-mono text-[12px] font-semibold", bad ? "bg-danger-soft text-danger" : "bg-blue-soft text-blue")}>H{i + 1}</div>
              <div className={cn("mt-2 text-[22px] font-semibold tabular-nums", bad ? "text-danger" : n ? "text-ink" : "text-ink-3")}>{n}</div>
            </div>
          );
        })}
      </div>
      {(h1 !== 1 || skip) && (
        <p className="flex gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {h1 === 0 ? "No H1 on this page. Add one that states the topic." : h1 > 1 ? `${h1} H1s found. Keep one and demote the rest to H2.` : `Levels skip from H${skip!.from} to H${skip!.to}. Keep the outline sequential.`}
        </p>
      )}
      <Panel title="Heading outline" sub="In page order; indentation follows the level" action={<CopyButton text={text} label="Copy headings" />}>
        {seo.headings.length === 0 ? (
          <Empty icon={Heading1}>No headings on this page.</Empty>
        ) : (
          <ol className="space-y-0.5 p-3">
            {seo.headings.map((h, i) => {
              const skipped = prev && h.level > prev + 1;
              prev = h.level;
              return (
                <li key={i} className={cn("flex items-start gap-2.5 rounded-lg py-1.5 pr-2", skipped && "bg-danger-soft")} style={{ paddingLeft: 8 + (h.level - 1) * 22 }}>
                  <span className={cn("mt-px w-7 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-semibold", h.level === 1 ? "bg-brand text-white" : skipped ? "bg-danger text-white" : "bg-blue-soft text-blue")}>
                    H{h.level}
                  </span>
                  <span className={cn("min-w-0 break-words text-[13.5px] leading-snug", h.level === 1 ? "font-medium text-ink" : "text-ink-2", !h.text && "italic text-ink-3")}>{h.text || "(empty heading)"}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}

/* ───────── Links ───────── */

const CONTENT_ONLY_KEY = "qasync-links-content-only";

function LinksTab({ seo }: { seo: SeoReport }) {
  const [q, setQ] = useState("");
  const [onlyBroken, setOnlyBroken] = useState(false);
  // Older audits didn't record where links sit, so the toggle needs a re-run there.
  const hasAreas = [...seo.links.internal, ...seo.links.external].some((l) => l.area);
  const [contentOnly, setContentOnly] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(CONTENT_ONLY_KEY) === "1") setContentOnly(true);
    } catch {
      /* ignore */
    }
  }, []);
  const exclude = hasAreas && contentOnly;
  function toggleContentOnly(v: boolean) {
    setContentOnly(v);
    try {
      localStorage.setItem(CONTENT_ONLY_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  const keep = (l: SeoLink) => !exclude || !l.area || l.area === "content";
  const internal = seo.links.internal.filter(keep);
  const external = seo.links.external.filter(keep);
  const both = [...seo.links.internal, ...seo.links.external];
  const navCount = both.filter((l) => l.area === "nav").length;
  const footerCount = both.filter((l) => l.area === "footer").length;

  const [kind, setKind] = useState<"internal" | "external">(seo.links.internal.length || !seo.links.external.length ? "internal" : "external");
  const all = kind === "internal" ? internal : external;
  const rows = all.filter((l) => (!onlyBroken || isBroken(l.status)) && (!q || `${l.url} ${l.anchor}`.toLowerCase().includes(q.toLowerCase())));
  const shown = [...internal, ...external];
  const broken = shown.filter((l) => isBroken(l.status)).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Internal" value={internal.length} />
        <Stat label="External" value={external.length} />
        <Stat label="Nofollow" value={shown.filter((l) => !l.dofollow).length} />
        <Stat label="Broken" value={broken} tone={broken ? "fail" : "pass"} />
      </div>
      <label
        className={cn(
          "flex items-center gap-3.5 rounded-2xl border bg-surface px-4 py-3.5 shadow-1 transition sm:px-5",
          exclude ? "border-brand/40" : "border-line",
          hasAreas ? "cursor-pointer" : "cursor-not-allowed opacity-70",
        )}
      >
        <Switch checked={exclude} disabled={!hasAreas} onChange={toggleContentOnly} label="Exclude navbar and footer links" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">Exclude navbar &amp; footer links</span>
          <span className="block text-[12.5px] text-ink-3">
            {hasAreas
              ? `Show only links in the page content. Hides ${navCount} navbar and ${footerCount} footer link${footerCount === 1 ? "" : "s"}.`
              : "Re-run this audit to use this: older audits didn't record where each link sits."}
          </span>
        </span>
      </label>
      <Panel
        title={
          <Segmented
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            options={[
              { id: "internal", label: `Internal (${internal.length})` },
              { id: "external", label: `External (${external.length})` },
            ]}
          />
        }
        action={<CopyButton text={all.map((l) => l.url).join("\n")} label="Copy links" />}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <label className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search URL or anchor…" className="input h-9 w-full pl-8 text-[13px]" aria-label="Search links" />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={onlyBroken} onChange={(e) => setOnlyBroken(e.target.checked)} className="accent-[var(--danger)]" /> Broken only
          </label>
        </div>
        {rows.length === 0 ? (
          <Empty icon={Link2}>{all.length ? "No links match." : exclude ? `No ${kind} links in the page content.` : `No ${kind} links on this page.`}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-wider text-ink-3">
                  <th className="w-10 px-4 py-2.5 font-medium">#</th>
                  <th className="px-2 py-2.5 font-medium">URL</th>
                  <th className="w-24 px-2 py-2.5 font-medium">Follow</th>
                  <th className="w-[28%] px-2 py-2.5 font-medium">Anchor text</th>
                  <th className="w-24 px-4 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((l, i) => (
                  <LinkRow key={l.url} l={l} n={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-ink-3">
          The first {seo.links.checked} links are checked. <b className="font-medium text-ink-2">Blocked</b> means the site refuses automated checks (common for LinkedIn, Clutch and Facebook), so open it to confirm. “—” means not checked.
        </p>
      </Panel>
    </div>
  );
}

function LinkRow({ l, n }: { l: SeoLink; n: number }) {
  const state = linkState(l.status);
  const bad = state === "broken";
  return (
    <tr className={cn(bad && "bg-danger-soft/60")}>
      <td className="px-4 py-2.5 font-mono text-[12px] text-ink-3">{n}</td>
      <td className="max-w-0 px-2 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-brand hover:underline" title={l.url}>
            {l.url.replace(/^https?:\/\//, "")}
          </a>
          {l.area && l.area !== "content" && (
            <span className="shrink-0 rounded border border-line px-1.5 py-px text-[10.5px] font-medium uppercase tracking-wide text-ink-3">{l.area === "nav" ? "Navbar" : "Footer"}</span>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5">
        {l.dofollow ? (
          <span className="inline-flex items-center gap-1 text-pass">
            <Check size={14} strokeWidth={2.5} /> dofollow
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-ink-3">
            <X size={14} /> nofollow
          </span>
        )}
      </td>
      <td className="max-w-0 truncate px-2 py-2.5 text-ink-2" title={l.anchor}>
        {l.anchor || <span className="italic text-ink-3">no text</span>}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-[12px]">
        {state === "unchecked" ? (
          <span className="text-ink-3">—</span>
        ) : bad ? (
          <span className="rounded-md bg-danger px-1.5 py-0.5 font-semibold text-white">{l.status || "ERR"}</span>
        ) : state === "blocked" ? (
          <span className="text-ink-3" title="The site refused an automated check; the link probably works">
            {l.status} · blocked
          </span>
        ) : (
          <span className="text-pass">{l.status} OK</span>
        )}
      </td>
    </tr>
  );
}

/* ───────── Images ───────── */

function ImagesTab({ seo }: { seo: SeoReport }) {
  const noAttr = seo.images.filter((i) => i.alt === null);
  const empty = seo.images.filter((i) => i.alt === "");
  const missing = [...noAttr, ...empty];
  const withAlt = seo.images.filter((i) => i.alt);
  const [view, setView] = useState<"missing" | "with">(missing.length ? "missing" : "with");
  const list = view === "missing" ? missing : withAlt;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Images" value={seo.images.length} />
        <Stat label="With alt text" value={withAlt.length} tone="pass" />
        <Stat label="Without alt" value={missing.length} tone={missing.length ? "fail" : "pass"} hint={missing.length ? `${noAttr.length} none · ${empty.length} empty` : undefined} />
      </div>
      {missing.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {[
              noAttr.length ? `${noAttr.length} image${noAttr.length === 1 ? " has" : "s have"} no alt attribute: describe what each one shows.` : "",
              empty.length ? `${empty.length} use empty alt="", which is fine for pure icons and dividers; describe any image that carries meaning.` : "",
            ]
              .filter(Boolean)
              .join(" ")}
          </span>
        </p>
      )}
      <Panel
        title={
          <Segmented
            value={view}
            onChange={(v) => setView(v as typeof view)}
            options={[
              { id: "missing", label: `Without alt (${missing.length})`, tone: missing.length ? "fail" : undefined },
              { id: "with", label: `With alt (${withAlt.length})` },
            ]}
          />
        }
        action={<CopyButton text={list.map((i) => i.src).join("\n")} label="Copy URLs" />}
      >
        {list.length === 0 ? (
          <Empty icon={view === "missing" ? Check : ImageOff}>{view === "missing" ? "Every image has alt text." : "No images with alt text."}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 200).map((img, i) => (
              <li key={`${img.src}-${i}`} className="flex items-center gap-3.5 px-4 py-3">
                <Thumb src={img.src} />
                <div className="min-w-0 flex-1">
                  <a href={img.src} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-ink hover:text-brand" title={img.src}>
                    {fileName(img.src)}
                  </a>
                  <div className="truncate font-mono text-[11.5px] text-ink-3">{img.src}</div>
                </div>
                <div className="hidden w-[38%] shrink-0 sm:block">
                  {img.alt === null ? (
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-danger">
                      <X size={13} strokeWidth={2.5} /> No alt attribute
                    </span>
                  ) : img.alt === "" ? (
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-danger">
                      <X size={13} strokeWidth={2.5} /> Empty alt=&quot;&quot;
                    </span>
                  ) : (
                    <span className="line-clamp-2 text-[12.5px] text-ink-2">“{img.alt}”</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {list.length > 200 && <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">Showing 200 of {list.length}.</p>}
      </Panel>
    </div>
  );
}

function Thumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-[repeating-conic-gradient(var(--surface-2)_0%_25%,var(--surface)_0%_50%)] bg-[length:10px_10px]">
      {failed || !src ? (
        <ImageOff size={16} className="text-ink-3" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
      )}
    </span>
  );
}

const fileName = (u: string) => {
  try {
    return decodeURIComponent(new URL(u).pathname.split("/").filter(Boolean).pop() ?? u);
  } catch {
    return u;
  }
};

/* ───────── Schema ───────── */

function SchemaTab({ seo }: { seo: SeoReport }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!seo.schema.length)
    return (
      <Panel title="Structured data">
        <Empty icon={Braces}>
          No JSON-LD or microdata on this page. Add at least <code className="font-mono">Organization</code> and <code className="font-mono">WebSite</code> schema to be eligible for rich results.
        </Empty>
      </Panel>
    );
  return (
    <div className="space-y-3">
      {seo.schema.map((s, i) => {
        const invalid = s.type === "Invalid JSON-LD";
        const isOpen = open === i;
        return (
          <section key={i} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
            <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left" aria-expanded={isOpen}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", invalid ? "bg-danger-soft text-danger" : "bg-blue-soft text-blue")}>
                <Braces size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium", invalid && "text-danger")}>{s.type}</span>
                <span className="text-[12px] text-ink-3">
                  {s.source === "json-ld" ? "JSON-LD" : "Microdata"} · {s.fields.length} propert{s.fields.length === 1 ? "y" : "ies"}
                </span>
              </span>
              <ChevronRight size={16} className={cn("shrink-0 text-ink-3 transition", isOpen && "rotate-90")} />
            </button>
            {isOpen && (
              <dl className="grid grid-cols-[minmax(110px,32%)_1fr] border-t border-line text-[13px]">
                {s.fields.map(([k, v], j) => (
                  <div key={j} className="contents">
                    <dt className="truncate border-b border-line bg-surface-2/50 px-5 py-2 font-mono text-[12px] text-accent-ink" title={k}>{k}</dt>
                    <dd className="break-words border-b border-line px-4 py-2 text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ───────── Social ───────── */

function SocialTab({ seo }: { seo: SeoReport }) {
  const og = seo.og;
  const tw = seo.twitter;
  const title = og["og:title"] ?? seo.title ?? "";
  const desc = og["og:description"] ?? seo.description ?? "";
  const image = og["og:image"] ?? tw["twitter:image"];
  let host = "";
  try {
    host = new URL(og["og:url"] ?? seo.finalUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const ogRows: [string, boolean][] = [...OG_REQUIRED.map((k) => [k, true] as [string, boolean]), ["og:type", false], ["og:site_name", false], ["og:locale", false]];
  const twRows = ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:site"];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel title="Link preview" sub="How the page looks when shared on Facebook, LinkedIn or Slack">
        <div className="p-4">
          <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
            <div className="flex aspect-[1.91/1] items-center justify-center overflow-hidden bg-surface">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-[13px] text-danger">
                  <ImageOff size={22} /> No og:image: previews will be text-only
                </span>
              )}
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="truncate text-[11.5px] uppercase tracking-wide text-ink-3">{host}</div>
              <div className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{title || <span className="text-danger">No title</span>}</div>
              {desc && <div className="mt-1 line-clamp-2 text-[13px] text-ink-2">{desc}</div>}
            </div>
          </div>
        </div>
      </Panel>
      <div className="space-y-5">
        <TagTable title="Open Graph" rows={ogRows.map(([k, req]) => ({ k, v: og[k], required: req }))} />
        <TagTable title="X (Twitter)" sub="Falls back to Open Graph when missing" rows={twRows.map((k) => ({ k, v: tw[k], required: false }))} />
      </div>
    </div>
  );
}

function TagTable({ title, sub, rows }: { title: string; sub?: string; rows: { k: string; v?: string; required: boolean }[] }) {
  return (
    <Panel title={title} sub={sub}>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.k} className="flex items-start gap-3 px-4 py-2.5">
            <span className="mt-0.5 shrink-0">
              {r.v ? <Check size={15} strokeWidth={2.5} className="text-pass" /> : r.required ? <X size={15} strokeWidth={2.5} className="text-danger" /> : <span className="block h-[15px] w-[15px] text-center leading-[15px] text-ink-3">–</span>}
            </span>
            <code className="w-36 shrink-0 font-mono text-[12px] text-accent-ink">{r.k}</code>
            <span className={cn("min-w-0 flex-1 break-words text-[13px]", r.v ? "text-ink-2" : r.required ? "text-danger" : "text-ink-3")}>
              {r.v ?? (r.required ? "Missing (required for a good preview)" : "Not set")}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ───────── Other checks (accessibility, fonts, spelling, broken links) ───────── */

function OtherChecks({ audit, project }: { audit: Audit; project: Project }) {
  const router = useRouter();
  const [made, setMade] = useState<Set<number>>(new Set());
  async function toIssue(f: AuditFinding, i: number) {
    await api.createIssue({
      projectId: project.id,
      pageUrl: audit.url,
      title: f.message,
      body: [f.message, f.detail].filter(Boolean).join("\n"),
      priority: f.severity === "error" ? "high" : f.severity === "warning" ? "medium" : "low",
      selector: f.selector ?? null,
      xPct: 50,
      yPct: 50,
    });
    setMade((s) => new Set(s).add(i));
    router.refresh();
  }
  return (
    <Panel
      title="Accessibility, fonts, spelling & links"
      sub={`Site health ${audit.score}/100 · ${audit.stats.errors} errors · ${audit.stats.warnings} warnings`}
    >
      {audit.findings.length === 0 ? (
        <Empty icon={Check}>No problems found.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {audit.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              {f.severity === "error" ? (
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
              ) : f.severity === "warning" ? (
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--st-progress)]" />
              ) : (
                <Info size={16} className="mt-0.5 shrink-0 text-ink-3" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px]">{f.message}</div>
                {f.detail && <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-3" title={f.detail}>{f.detail}</div>}
              </div>
              <span className="hidden shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3 sm:inline">{f.rule}</span>
              <button
                onClick={() => toIssue(f, i)}
                disabled={made.has(i)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] text-ink-3 hover:bg-surface-2 hover:text-ink disabled:text-pass"
                title="Turn into an issue"
              >
                {made.has(i) ? <Check size={14} /> : <MessageSquarePlus size={14} />}
                <span className="hidden md:inline">{made.has(i) ? "Issue created" : "Create issue"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────── Small building blocks ───────── */

function Panel({ title, sub, action, children }: { title: ReactNode; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {typeof title === "string" ? <h2 className="font-semibold">{title}</h2> : title}
          {sub && <p className="text-[12.5px] text-ink-3">{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: number; tone?: "pass" | "fail"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-1">
      <div className="text-[12.5px] text-ink-3">{label}</div>
      <div className={cn("mt-1 flex items-baseline gap-2 text-[24px] font-semibold tabular-nums leading-none", tone === "fail" ? "text-danger" : tone === "pass" ? "text-pass" : "text-ink")}>
        {value}
        {hint && <span className="text-[12px] font-normal text-ink-3">{hint}</span>}
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string; tone?: "fail" }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-[13px]" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("rounded-md px-3 py-1.5 transition", value === o.id ? "bg-surface font-medium shadow-1" : "text-ink-3 hover:text-ink", value === o.id && o.tone === "fail" ? "text-danger" : value === o.id && "text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span
        aria-hidden
        className={cn(
          "h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      />
      <span aria-hidden className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-1 transition-transform", checked && "translate-x-5")} />
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy", text);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return (
    <button onClick={copy} disabled={!text} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-ink-2 transition hover:border-line-strong hover:text-ink disabled:opacity-40">
      {done ? <Check size={14} className="text-pass" /> : <Copy size={14} />} {done ? "Copied" : label}
    </button>
  );
}

function Empty({ icon: Icon, children }: { icon: typeof Type; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-[13.5px] text-ink-3">
      <Icon size={20} />
      <div className="max-w-md">{children}</div>
    </div>
  );
}
