"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import { ISSUE_HEADER, issueRows } from "@/components/app/export-issues";
import { connectGoogleDrive, googleExportReady, preloadGoogle, savedDriveLink, syncPageSheet, type DriveLink } from "@/lib/google-drive";
import type { Issue } from "@/lib/types";
import { cn, pageKey } from "@/lib/utils";

/** What the review canvas sends: the current page of a project (members only). */
export type SendTarget = { projectId: string; projectName: string; pageUrl: string; pageName: string; pageIssues: Issue[] };

type NotionState = { configured: boolean; connected: boolean; linked: boolean; databaseUrl: string | null; pages: Record<string, string> };
type Outcome = { ok: boolean; text: string; href?: string; hrefLabel?: string };

const NOTION_BATCH = 5; // per request, so a long page shows progress and never hits a server time limit

/**
 * "Send" in the review canvas goes to every destination that's turned on: the project's Notion
 * database (when linked) and the QASync folder in Google Drive (when connected in this browser).
 */
export function useSender(target?: SendTarget) {
  const projectId = target?.projectId;
  const [notion, setNotion] = useState<NotionState | null>(null);
  const [drive, setDrive] = useState<DriveLink | null>(null);
  const [progress, setProgress] = useState<{ notion?: string; drive?: string } | null>(null);
  const [outcome, setOutcome] = useState<{ notion?: Outcome; drive?: Outcome } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const driveReady = googleExportReady();

  const loadNotion = useCallback(() => {
    if (!projectId) return;
    fetch(`/api/integrations/notion/push?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NotionState | null) => d && setNotion(d))
      .catch(() => {});
  }, [projectId]);
  useEffect(loadNotion, [loadNotion]);

  useEffect(() => {
    if (!projectId) return;
    const read = () => setDrive(savedDriveLink());
    read();
    window.addEventListener("qasync-drive", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("qasync-drive", read);
      window.removeEventListener("storage", read);
    };
  }, [projectId]);

  // Results belong to the page they were sent from.
  const pageUrl = target?.pageUrl;
  useEffect(() => setOutcome(null), [pageUrl]);

  const notionOn = !!notion?.linked;
  const driveOn = driveReady && !!drive;

  async function toNotion(ids: string[]): Promise<Outcome> {
    const pages: Record<string, string> = {};
    const errors: string[] = [];
    for (let k = 0; k < ids.length; k += NOTION_BATCH) {
      setProgress((p) => ({ ...p, notion: `Sending ${Math.min(k + NOTION_BATCH, ids.length)} of ${ids.length}…` }));
      const res = await fetch("/api/integrations/notion/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ issueIds: ids.slice(k, k + NOTION_BATCH) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) loadNotion(); // unlinked meanwhile
        throw new Error(d.error ?? "Couldn't send to Notion");
      }
      for (const [id, url] of Object.entries((d.results ?? {}) as Record<string, string | null>)) if (url) pages[id] = url;
      errors.push(...Object.values((d.errors ?? {}) as Record<string, string>));
    }
    setNotion((n) => n && { ...n, pages: { ...n.pages, ...pages } });
    const sent = Object.keys(pages).length;
    const link = notion?.databaseUrl ? { href: notion.databaseUrl, hrefLabel: "Open the database" } : {};
    if (errors.length) return { ok: false, text: `Sent ${sent}, ${errors.length} failed: ${errors[0]}`, ...link };
    return { ok: true, text: `Sent ${sent} ${sent === 1 ? "comment" : "comments"}`, ...link };
  }

  async function toDrive(t: SendTarget): Promise<Outcome> {
    setProgress((p) => ({ ...p, drive: "Updating the page's sheet…" }));
    const rows = issueRows([...t.pageIssues].sort((a, b) => a.number - b.number));
    const r = await syncPageSheet({ projectId: t.projectId, projectName: t.projectName, pageKey: pageKey(t.pageUrl), pageName: t.pageName, header: ISSUE_HEADER, rows });
    return { ok: true, text: `${r.updated ? "Sheet updated" : "Sheet created"} · ${rows.length} ${rows.length === 1 ? "comment" : "comments"}`, href: r.url, hrefLabel: "Open the sheet" };
  }

  /**
   * Sends the given comments to Notion, and refreshes the page's sheet in Drive (which always holds
   * every comment on the page). Drive starts first: Google may need its sign-in popup, and browsers
   * only allow that straight after the click.
   */
  async function send(ids: string[]) {
    if (!target || progress) return;
    setOutcome(null);
    const out: { notion?: Outcome; drive?: Outcome } = {};
    const fail = (e: unknown): Outcome => ({ ok: false, text: (e as Error).message || "Something went wrong" });
    const jobs: Promise<void>[] = [];
    if (driveOn) jobs.push(toDrive(target).then((o) => void (out.drive = o), (e) => void (out.drive = fail(e))));
    if (notionOn && ids.length) jobs.push(toNotion(ids).then((o) => void (out.notion = o), (e) => void (out.notion = fail(e))));
    if (!jobs.length) return;
    setProgress({});
    await Promise.all(jobs);
    setProgress(null);
    setOutcome(out);
  }

  /** One comment, from its ⋯ menu: Notion only. Returns the row's URL. */
  async function sendOne(id: string): Promise<string | null> {
    const res = await fetch("/api/integrations/notion/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ issueId: id }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? "Couldn't send to Notion");
    if (d.url) setNotion((n) => n && { ...n, pages: { ...n.pages, [id]: d.url } });
    return d.url ?? null;
  }

  async function connectDrive() {
    setConnecting(true);
    try {
      setDrive(await connectGoogleDrive());
    } catch (e) {
      setOutcome((o) => ({ ...o, drive: { ok: false, text: (e as Error).message } }));
    } finally {
      setConnecting(false);
    }
  }

  return { notion, drive, driveReady, notionOn, driveOn, anyOn: notionOn || driveOn, busy: !!progress, progress, outcome, connecting, send, sendOne, connectDrive, reloadNotion: loadNotion };
}

export type Sender = ReturnType<typeof useSender>;

/** "Send this page" popover in the comment panel. Anything not set up yet opens its setup popup. */
export function SendPanel({ sender: s, target, onSetup }: { sender: Sender; target: SendTarget; onSetup: (kind: "notion" | "drive") => void }) {
  const count = target.pageIssues.length;
  useEffect(() => preloadGoogle(), []);
  const setUp = (kind: "notion" | "drive", label = "Set up") => (
    <button onClick={() => onSetup(kind)} className="inline-flex h-7 items-center rounded-md px-2 text-[12px] font-medium text-brand-ink hover:bg-surface-2">
      {label}
    </button>
  );

  return (
    <div className="text-[13px]">
      <div className="px-3 pb-2 pt-2.5">
        <div className="font-semibold text-ink">Send this page</div>
        <div className="mt-0.5 truncate text-[12px] text-ink-3">
          {target.pageName} · {count} {count === 1 ? "comment" : "comments"}
        </div>
      </div>

      <div className="space-y-0.5 px-1.5">
        <Destination
          icon="Notion"
          name="Notion"
          on={s.notionOn}
          sub={
            s.notion === null
              ? "Checking…"
              : s.notionOn
                ? "A row per comment in your database"
                : !s.notion.configured
                  ? "Not set up yet"
                  : !s.notion.connected
                    ? "Not connected"
                    : "Pick a database for this project"
          }
          progress={s.progress?.notion}
          outcome={s.outcome?.notion}
          action={s.notion && !s.notionOn ? setUp("notion", s.notion.configured && !s.notion.connected ? "Connect" : "Set up") : null}
        />
        <Destination
          icon="Google Drive"
          name="Google Drive"
          on={s.driveOn}
          sub={s.driveOn ? `QASync / ${target.projectName} · one sheet per page` : !s.driveReady ? "Not set up yet" : "Not connected"}
          progress={s.progress?.drive}
          outcome={s.outcome?.drive}
          action={
            !s.driveReady ? (
              setUp("drive")
            ) : !s.driveOn ? (
              <button
                onClick={s.connectDrive}
                disabled={s.connecting}
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-brand-ink hover:bg-surface-2 disabled:opacity-60"
              >
                {s.connecting && <Loader2 size={12} className="animate-spin" />} Connect
              </button>
            ) : null
          }
        />
      </div>

      <div className="mt-1.5 border-t border-line p-2">
        <Button size="sm" className="w-full" loading={s.busy} disabled={!s.anyOn || !count || s.busy} onClick={() => s.send(target.pageIssues.map((i) => i.id))}>
          {!s.busy && <Send size={13} />}
          {s.busy ? "Sending…" : `Send ${count} ${count === 1 ? "comment" : "comments"}`}
        </Button>
        {!s.anyOn && <p className="mt-1.5 px-1 text-center text-[11.5px] text-ink-3">Turn on Notion or Google Drive to send.</p>}
      </div>
    </div>
  );
}

function Destination({
  icon,
  name,
  on,
  sub,
  progress,
  outcome,
  action,
}: {
  icon: string;
  name: string;
  on: boolean;
  sub: string;
  progress?: string;
  outcome?: Outcome;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-1.5 py-2">
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2", !on && "opacity-60")}>
        <IntegrationIcon name={icon} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{name}</span>
          {on && <span className="rounded bg-[var(--st-verified)]/12 px-1.5 py-px text-[10.5px] font-medium text-[var(--st-verified)]">On</span>}
        </div>
        {progress ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <Loader2 size={11} className="animate-spin" /> {progress}
          </div>
        ) : outcome ? (
          <div role={outcome.ok ? "status" : "alert"} className={cn("mt-0.5 text-[11.5px]", outcome.ok ? "text-ink-2" : "text-danger")}>
            {outcome.ok && <Check size={11} className="mr-1 inline text-[var(--st-verified)]" />}
            {outcome.text}
            {outcome.href && (
              <>
                {" · "}
                <a href={outcome.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand-ink hover:underline">
                  {outcome.hrefLabel} <ExternalLink size={10} />
                </a>
              </>
            )}
          </div>
        ) : (
          <div className="mt-0.5 truncate text-[11.5px] text-ink-3">{sub}</div>
        )}
      </div>
      {action}
    </div>
  );
}
