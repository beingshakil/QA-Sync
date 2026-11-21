"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Crosshair, Loader2, Plus, RotateCcw, Search, Trash2, Wand2 } from "lucide-react";
import { api, type GuestCtx } from "@/lib/api";
import { PAGE_STATE_COLOR, PAGE_STATE_LABEL, type Page, type PageState } from "@/lib/types";
import { Ago, Button } from "@/components/ui";
import { cn, pageLabel, pagePath } from "@/lib/utils";
import { useConfirm } from "@/components/confirm";


const STATES: PageState[] = ["in_review", "ready", "not_reviewed", "passed"];

export function PagesOverview({
  projectId,
  initial,
  guest,
  currentKey,
  onOpen,
  live = true,
}: {
  projectId: string;
  initial: Page[];
  guest?: GuestCtx;
  currentKey?: string;
  /** In the canvas: switch page. Elsewhere: link into the canvas. */
  onOpen?: (p: Page) => void;
  live?: boolean;
}) {
  const [pages, setPages] = useState(initial);
  const [filter, setFilter] = useState<PageState | "all">("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const confirmDialog = useConfirm();

  const reload = useCallback(async () => {
    try {
      setPages(await api.pages(projectId, guest));
    } catch {
      /* keep */
    }
  }, [projectId, guest]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [reload, live]);

  const counts = useMemo(() => {
    const c: Record<PageState, number> = { not_reviewed: 0, in_review: 0, ready: 0, passed: 0 };
    for (const p of pages) c[p.state]++;
    return c;
  }, [pages]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return pages.filter(
      (p) => (filter === "all" || p.state === filter) && (!s || pageLabel(p).toLowerCase().includes(s) || p.url.toLowerCase().includes(s)),
    );
  }, [pages, filter, q]);

  const totalIssues = pages.reduce((n, p) => n + p.total, 0);
  const openIssues = pages.reduce((n, p) => n + p.open, 0);

  async function run(key: string, fn: () => Promise<Page[]>, ok?: string) {
    setBusy(key);
    setMsg(null);
    try {
      setPages(await fn());
      if (ok) setMsg({ tone: "ok", text: ok });
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function discover() {
    setBusy("discover");
    setMsg(null);
    try {
      const r = await api.discoverPages(projectId);
      setPages(r.pages);
      setMsg({ tone: "ok", text: r.added ? `Added ${r.added} page${r.added === 1 ? "" : "s"} from the site's ${r.source === "sitemap" ? "sitemap" : "links"}.` : "No new pages found." });
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* coverage summary */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-1">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-48 w-80 rounded-full bg-grad-soft blur-3xl" />
        <div className="relative flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div className="text-[15px]">
            <b className="font-mono text-2xl font-semibold">{counts.passed}</b>
            <span className="text-ink-3"> / {pages.length} pages QA passed</span>
          </div>
          <div className="text-[13px] text-ink-3">
            {openIssues} open of {totalIssues} issues across all pages
          </div>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-line">
          {(["passed", "ready", "in_review", "not_reviewed"] as PageState[]).map((s) =>
            counts[s] ? <div key={s} style={{ width: `${(counts[s] / pages.length) * 100}%`, background: PAGE_STATE_COLOR[s] }} title={`${PAGE_STATE_LABEL[s]}: ${counts[s]}`} /> : null,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All <span className="font-mono opacity-60">{pages.length}</span>
          </Chip>
          {STATES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              <span className="h-2 w-2 rounded-full" style={{ background: PAGE_STATE_COLOR[s] }} />
              {PAGE_STATE_LABEL[s]} <span className="font-mono opacity-60">{counts[s]}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* tools */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search size={14} className="text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        {!guest && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adding.trim()) run("add", () => api.addPage(projectId, adding.trim()), "Page added.").then(() => setAdding(""));
              }}
              className="flex h-9 items-center gap-1 rounded-lg border border-line bg-surface pl-3"
            >
              <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="/pricing or full URL" className="w-40 bg-transparent font-mono text-[12.5px] outline-none" />
              <button disabled={!adding.trim() || busy === "add"} className="flex h-full items-center gap-1 border-l border-line px-3 text-[13px] font-medium text-ink-2 hover:text-ink disabled:opacity-40">
                <Plus size={14} /> Add page
              </button>
            </form>
            <Button variant="secondary" size="sm" className="h-9" onClick={discover} disabled={busy === "discover"} title="Read the sitemap or the start page's links">
              {busy === "discover" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Import pages from site
            </Button>
          </>
        )}
      </div>
      {msg && <p className={cn("text-sm", msg.tone === "err" ? "text-danger" : "text-[var(--st-verified)]")}>{msg.text}</p>}

      {/* page list */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
        <div className="hidden grid-cols-[minmax(0,1fr)_140px_150px_140px_260px] gap-4 border-b border-line px-5 py-2.5 text-[12px] text-ink-3 md:grid">
          <span>Page</span>
          <span>Issues</span>
          <span>Status</span>
          <span>QA sign-off</span>
          <span />
        </div>
        {shown.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-3">No pages match.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((p) => {
              const pct = p.total ? Math.round(((p.total - p.open) / p.total) * 100) : 0;
              const current = currentKey && p.key === currentKey;
              const href = `/app/projects/${p.projectId}/review?page=${encodeURIComponent(p.url)}`;
              return (
                <li key={p.id} className={cn("grid items-center gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_140px_150px_140px_260px]", current && "bg-blue-soft/50")}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PAGE_STATE_COLOR[p.state] }} />
                      <span className="truncate font-medium">{pageLabel(p)}</span>
                      {current && <span className="rounded bg-blue px-1.5 text-[10px] font-semibold text-white">VIEWING</span>}
                    </div>
                    {p.title && <div className="mt-0.5 truncate pl-[18px] text-[12.5px] text-ink-2" title={p.title}>{p.title}</div>}
                    <div className="mt-0.5 truncate pl-[18px] font-mono text-[11.5px] text-ink-3" title={p.url}>
                      {pagePath(p.url)}
                      {p.lastVisitedAt && <span className="font-sans"> · visited <Ago iso={p.lastVisitedAt} /></span>}
                    </div>
                  </div>
                  <div className="text-[13px]">
                    {p.total ? (
                      <>
                        <span className="font-mono font-semibold">{p.open}</span>
                        <span className="text-ink-3"> open · {p.total} total</span>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                          <div className="h-full bg-[var(--st-verified)]" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-3">No issues</span>
                    )}
                  </div>
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium"
                      style={{ borderColor: PAGE_STATE_COLOR[p.state], color: PAGE_STATE_COLOR[p.state] }}
                    >
                      {p.state === "passed" && <BadgeCheck size={12} />}
                      {PAGE_STATE_LABEL[p.state]}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-ink-3">
                    {p.qaStatus === "done" && p.qaBy && p.qaAt ? (
                      <>
                        <span className="text-ink-2">{p.qaBy}</span> · <Ago iso={p.qaAt} />
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {p.qaStatus === "done" ? (
                      <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => run(p.id, () => api.setPageQa(p.id, "pending", guest))} title="Undo sign-off">
                        <RotateCcw size={13} /> Undo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === p.id || p.open > 0}
                        title={p.open > 0 ? "Resolve this page's open issues first" : "Sign this page off as QA passed"}
                        onClick={() => run(p.id, () => api.setPageQa(p.id, "done", guest))}
                      >
                        <BadgeCheck size={13} /> Mark passed
                      </Button>
                    )}
                    {onOpen ? (
                      <Button size="sm" variant="ghost" onClick={() => onOpen(p)} title="Review this page">
                        <Crosshair size={13} /> Open
                      </Button>
                    ) : (
                      <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink" title="Review this page">
                        <Crosshair size={13} /> Open
                      </Link>
                    )}
                    {!guest && p.total === 0 && (
                      <button
                        onClick={async () => {
                          const yes = await confirmDialog({ title: "Remove this page?", message: <><b>{pagePath(p.url)}</b> will be removed from the QA checklist. It has no issues, so nothing else is lost.</>, confirmLabel: "Remove page" });
                          if (yes) run(p.id, () => api.deletePage(p.id));
                        }}
                        className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-danger"
                        title="Remove page"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", active ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-line-strong")}
    >
      {children}
    </button>
  );
}
