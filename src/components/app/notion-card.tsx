"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Database, ExternalLink, FileText, RefreshCw, Search } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import { cn, timeAgo } from "@/lib/utils";
import { NotionKeysForm, useSetupInfo } from "@/components/app/integration-setup";

type Status = {
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  link: { databaseId: string; databaseUrl: string | null; mode: Mode; lastSyncAt: string | null } | null;
};
type Mode = "all" | "urgent" | "manual";
type Target = { id: string; type: "page" | "database"; title: string; url: string | null };

const MODES: { id: Mode; label: string }[] = [
  { id: "all", label: "Every new issue" },
  { id: "urgent", label: "Only Urgent and High" },
  { id: "manual", label: "Only when I click “Send to Notion”" },
];

const RETURN_MSG: Record<string, [string, boolean]> = {
  connected: ["Notion is connected. Now pick where issues should go.", true],
  cancelled: ["Connecting Notion was cancelled.", false],
  denied: ["Finish connecting in the same account and workspace you started from.", false],
  expired: ["That connection link expired. Try again.", false],
  failed: ["Notion didn't accept the connection. Try again; the admin Errors list has details.", false],
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

/**
 * Notion for a project: one-time keys (admins), connect, pick a database (or create one), choose
 * what's sent, sync. Lives in project settings, and (bare) in the review canvas's setup popup.
 */
export function NotionCard({ projectId, back, bare = false, onLinked }: { projectId: string; back?: string; bare?: boolean; onLinked?: () => void }) {
  const params = useSearchParams();
  const ret = params.get("notion");
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [mode, setMode] = useState<Mode>("all");
  const [synced, setSynced] = useState<string | null>(null);
  const [editKeys, setEditKeys] = useState(false);
  const info = useSetupInfo(!!s && !s.connected);
  const startUrl = `/api/integrations/notion/start?projectId=${encodeURIComponent(projectId)}${back ? `&back=${encodeURIComponent(back)}` : ""}`;

  const load = useCallback(async () => {
    try {
      setS(await call<Status>(`/api/integrations/notion?projectId=${encodeURIComponent(projectId)}`));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [projectId]);
  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(async (query: string) => {
    setBusy("search");
    try {
      setTargets(await call<Target[]>(`/api/integrations/notion/targets?q=${encodeURIComponent(query)}`));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);
  useEffect(() => {
    if (s?.connected && !s.link && targets === null) search("");
  }, [s, targets, search]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const link = (t: Target) =>
    run(`link-${t.id}`, async () => {
      await call("/api/integrations/notion/link", { method: "POST", body: JSON.stringify({ projectId, mode, ...(t.type === "database" ? { databaseId: t.id } : { parentPageId: t.id }) }) });
      await load();
      onLinked?.();
    });

  const ret0 = ret && RETURN_MSG[ret];

  const Wrap = bare ? "div" : "section";
  return (
    <Wrap {...(bare ? {} : { id: "notion", className: "scroll-mt-6 rounded-2xl border border-line bg-surface p-6 shadow-1" })}>
      {!bare && (
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink">
            <IntegrationIcon name="Notion" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Notion</h2>
            <p className="text-[13px] text-ink-3">Issues become rows in a Notion database, with the comment, screenshot, element specs and browser details. Status stays in sync both ways.</p>
          </div>
        </div>
      )}

      {ret0 && (
        <p role="status" className={cn("rounded-lg px-3 py-2 text-[13px]", !bare && "mt-4", ret0[1] ? "bg-pass-soft text-ink" : "bg-danger-soft text-danger")}>
          {ret0[0]}
        </p>
      )}

      <div className={cn(bare ? (ret0 ? "mt-4" : "") : "mt-5")}>
        {!s ? (
          <p className="text-[13px] text-ink-3">Loading…</p>
        ) : !s.configured || editKeys ? (
          info ? (
            <NotionKeysForm info={info} onSaved={() => (window.location.href = startUrl)} />
          ) : (
            <p className="text-[13px] text-ink-3">Loading…</p>
          )
        ) : !s.connected ? (
          <div className="space-y-3">
            {bare && <p className="text-[13.5px] text-ink-2">Connect your Notion workspace, then pick where this project&apos;s issues should go.</p>}
            <div className="flex flex-wrap items-center gap-2">
              <a href={startUrl} className={buttonClass("primary", "md")}>
                Connect Notion
              </a>
              {info?.canSetup && info.notion.source === "app" && (
                <Button variant="ghost" size="sm" onClick={() => setEditKeys(true)}>
                  Change keys
                </Button>
              )}
            </div>
          </div>
        ) : !s.link ? (
          <div className="space-y-4">
            <p className="text-[13.5px] text-ink-2">
              Connected to <b className="text-ink">{s.accountName}</b>. Pick a page to create a ready-made “QASync Issues” database in, or an existing database.
            </p>
            <label className="block">
              <span className="text-[12.5px] text-ink-3">Send</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="input mt-1">
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                search(q);
              }}
            >
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your shared Notion pages" className="input" aria-label="Search Notion" />
              <Button variant="secondary" loading={busy === "search"} className="shrink-0">
                {busy !== "search" && <Search size={15} />} Search
              </Button>
            </form>
            {targets && targets.length === 0 && (
              <p className="text-[13px] text-ink-3">Nothing shared yet. Reconnect Notion and tick the page where issues should go.</p>
            )}
            {targets && targets.length > 0 && (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {targets.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                    {t.type === "database" ? <Database size={15} className="shrink-0 text-ink-3" /> : <FileText size={15} className="shrink-0 text-ink-3" />}
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
                    <Button size="sm" variant={t.type === "page" ? "primary" : "secondary"} loading={busy === `link-${t.id}`} disabled={!!busy} onClick={() => link(t)}>
                      {t.type === "page" ? "Create database here" : "Use this database"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13.5px] text-ink-2">
              Sending to{" "}
              {s.link.databaseUrl ? (
                <a href={s.link.databaseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-ink hover:underline">
                  the QASync database <ExternalLink size={13} />
                </a>
              ) : (
                <b>the QASync database</b>
              )}{" "}
              in {s.accountName}. Status changes come back from Notion, except Verified: only a person in QASync verifies a fix.
            </p>
            <label className="block max-w-sm">
              <span className="text-[12.5px] text-ink-3">Send</span>
              <select
                value={s.link.mode}
                onChange={(e) =>
                  run("mode", async () => {
                    await call("/api/integrations/notion/link", { method: "PATCH", body: JSON.stringify({ projectId, mode: e.target.value }) });
                    await load();
                  })
                }
                className="input mt-1"
              >
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "sync"}
                onClick={() =>
                  run("sync", async () => {
                    const r = await call<{ checked: number; updated: number }>("/api/integrations/notion/sync", { method: "POST", body: JSON.stringify({ projectId }) });
                    setSynced(r.updated ? `${r.updated} status change${r.updated === 1 ? "" : "s"} brought in from Notion.` : "Up to date.");
                    await load();
                  })
                }
              >
                {busy !== "sync" && <RefreshCw size={14} />} Sync now
              </Button>
              <span className="text-[12.5px] text-ink-3">{synced ?? (s.link.lastSyncAt ? `Last synced ${timeAgo(s.link.lastSyncAt)}` : "Not synced yet")}</span>
              <span className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                loading={busy === "unlink"}
                onClick={() =>
                  run("unlink", async () => {
                    await call(`/api/integrations/notion/link?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
                    setTargets(null);
                    await load();
                  })
                }
              >
                Unlink project
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={busy === "disconnect"}
                onClick={() =>
                  run("disconnect", async () => {
                    await call("/api/integrations/notion", { method: "DELETE" });
                    setTargets(null);
                    await load();
                  })
                }
              >
                Disconnect Notion
              </Button>
            </div>
          </div>
        )}
        {err && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {err}
          </p>
        )}
      </div>
    </Wrap>
  );
}
