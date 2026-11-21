"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotionIssueButton } from "./notion-issue-button";
import { BadgeCheck, Check, ChevronDown, Copy, Crosshair, FileText, Link2, MoreHorizontal, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { api, type GuestCtx } from "@/lib/api";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Activity, type Attachment, type Comment, type Issue, type Status } from "@/lib/types";
import { Avatar, Button, PriorityIcon, StatusBadge, StatusDot, Ago } from "@/components/ui";
import { cn, pagePath } from "@/lib/utils";

interface Props {
  issueId: string;
  guest?: GuestCtx;
  onChange?: (issue: Issue) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
  onLocate?: (issue: Issue) => void;
  refreshKey?: number;
  members?: string[];
  /** Current member's name; guests are identified by their guest name. */
  me?: string;
}

export function IssueDetail({ issueId, guest, onChange, onDeleted, onClose, onLocate, refreshKey, members = [], me }: Props) {
  const [data, setData] = useState<{ issue: Issue; comments: Comment[]; activity: Activity[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"thread" | "context">("thread");
  const isMember = !guest;
  const confirmDialog = useConfirm();
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const myName = guest ? guest.guestName : me;
  const [headMenu, setHeadMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const headMenuRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!headMenu) return;
    const close = (e: MouseEvent) => !headMenuRef.current?.contains(e.target as Node) && setHeadMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [headMenu]);

  const load = useCallback(async () => {
    try {
      setData(await api.issue(issueId, guest));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [issueId, guest]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return <div role="alert" className="p-5 text-sm text-danger">{err}</div>;
  if (!data) return <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-4 rounded" />)}</div>;

  const { issue, comments, activity } = data;

  async function patch(p: Parameters<typeof api.updateIssue>[1]) {
    try {
      const updated = await api.updateIssue(issue.id, p, guest);
      onChange?.(updated);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.comment(issue.id, reply, guest);
      setReply("");
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  // Members edit/delete any comment; guests only their own.
  const canEditIssue = isMember || (issue.reporterType === "guest" && issue.reporterName === guest?.guestName);
  // Replies: authors edit their own; members may delete any; guests delete their own.
  const canEditReply = (c: Comment) => c.author === myName && c.authorType === (guest ? "guest" : "member");
  const canDeleteReply = (c: Comment) => isMember || canEditReply(c);

  async function saveBody() {
    try {
      const updated = await api.updateIssue(issue.id, { body: bodyDraft, retitle: true }, guest);
      onChange?.(updated);
      setEditingBody(false);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function deleteIssue() {
    const yes = await confirmDialog({
      title: `Delete comment #${issue.number}?`,
      message: <>“{issue.title}” and its {comments.length ? `${comments.length} repl${comments.length === 1 ? "y" : "ies"}` : "thread"} will be permanently deleted. This can&apos;t be undone.</>,
      confirmLabel: "Delete comment",
    });
    if (!yes) return;
    try {
      await api.deleteIssue(issue.id, guest);
      onDeleted?.(issue.id);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function saveReply(c: Comment) {
    if (!replyDraft.trim()) return;
    try {
      await api.updateComment(c.id, replyDraft.trim(), guest);
      setEditingReply(null);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function deleteReply(c: Comment) {
    const yes = await confirmDialog({
      title: "Delete this reply?",
      message: <>“{c.body.length > 120 ? c.body.slice(0, 120) + "…" : c.body}” will be permanently deleted.</>,
      confirmLabel: "Delete reply",
    });
    if (!yes) return;
    try {
      await api.deleteComment(c.id, guest);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const history = activity.filter((a) => a.type !== "comment");
  const timeline = [
    ...comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...(showActivity ? history : []).map((a) => ({ kind: "activity" as const, at: a.createdAt, a })),
  ].sort((x, y) => x.at.localeCompare(y.at));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-ink-3">#{issue.number}</span>
          <StatusBadge status={issue.status} />
          <span title={`Page: ${issue.pageUrl}`} className="max-w-[140px] truncate rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">
            {pagePath(issue.pageUrl)}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {onLocate && (
              <button onClick={() => onLocate(issue)} title="Show on page" className="rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
                <Crosshair size={15} />
              </button>
            )}
            <span ref={headMenuRef} className="relative">
              <button
                title="More options"
                aria-label="Comment options"
                aria-expanded={headMenu}
                onClick={() => setHeadMenu((m) => !m)}
                className={cn("rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink", headMenu && "bg-surface-2 text-ink")}
              >
                <MoreHorizontal size={16} />
              </button>
              {headMenu && (
                <div className="animate-pop absolute right-0 top-8 z-30 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2">
                  {canEditIssue && (
                    <button
                      onClick={() => {
                        setHeadMenu(false);
                        setBodyDraft(issue.body || issue.title);
                        setEditingBody(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface-2"
                    >
                      <Pencil size={14} /> Edit comment
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const base = guest ? `/r/${guest.shareToken}` : `/app/projects/${issue.projectId}/review`;
                      const url = `${window.location.origin}${base}?page=${encodeURIComponent(issue.pageUrl)}&issue=${issue.id}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 1800);
                      } catch {
                        window.prompt("Copy this link", url);
                      }
                      setHeadMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface-2"
                  >
                    <Link2 size={14} /> Copy link to comment
                  </button>
                  {canEditIssue && (
                    <>
                      <div className="my-1 border-t border-line" />
                      <button
                        onClick={() => {
                          setHeadMenu(false);
                          deleteIssue();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-danger hover:bg-danger-soft"
                      >
                        <Trash2 size={14} /> Delete comment
                      </button>
                    </>
                  )}
                </div>
              )}
            </span>
            {linkCopied && (
              <span className="flex items-center gap-1 text-[11.5px] text-[var(--st-verified)]">
                <Check size={12} /> Link copied
              </span>
            )}
            {onClose && (
              <button onClick={onClose} title="Close" className="rounded p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
                <X size={16} />
              </button>
            )}
          </span>
        </div>
        {isMember ? (
          <textarea
            key={issue.id + issue.title}
            defaultValue={issue.title}
            rows={1}
            onBlur={(e) => e.target.value.trim() && e.target.value !== issue.title && patch({ title: e.target.value })}
            className="mt-2 w-full resize-none bg-transparent text-[16px] font-semibold leading-snug text-ink outline-none [field-sizing:content]"
          />
        ) : (
          <h3 className="mt-2 text-[16px] font-semibold leading-snug">{issue.title}</h3>
        )}
        {editingBody ? (
          <div className="mt-2">
            <textarea
              autoFocus
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveBody();
                if (e.key === "Escape") setEditingBody(false);
              }}
              rows={4}
              className="block w-full resize-y rounded-lg border border-blue bg-paper px-3 py-2 text-[14px] leading-relaxed outline-none"
            />
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <span className="mr-auto text-[11.5px] text-ink-3">The title updates from your text.</span>
              <Button size="sm" variant="ghost" onClick={() => setEditingBody(false)}>Cancel</Button>
              <Button size="sm" onClick={saveBody} disabled={!bodyDraft.trim()}>Save</Button>
            </div>
          </div>
        ) : (
          issue.body && (
            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
              {issue.body}
              {issue.editedAt && <span className="ml-1.5 text-[11.5px] text-ink-3">(edited)</span>}
            </p>
          )
        )}
        {issue.attachments?.length > 0 && <Attachments items={issue.attachments} />}

        {/* properties */}
        <div className="mt-3 grid grid-cols-[80px_1fr] items-center gap-y-1.5 text-[13px]">
          <span className="text-ink-3">Status</span>
          {isMember ? (
            <Select value={issue.status} onChange={(v) => patch({ status: v as Status })} options={STATUSES.map((s) => [s, STATUS_LABEL[s]])} dot />
          ) : (
            <span>{STATUS_LABEL[issue.status]}</span>
          )}
          <span className="text-ink-3">Priority</span>
          {isMember ? (
            <Select value={issue.priority} onChange={(v) => patch({ priority: v as Issue["priority"] })} options={PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])} prio />
          ) : (
            <PriorityIcon priority={issue.priority} label />
          )}
          <span className="text-ink-3">Assignee</span>
          {isMember ? (
            <Select value={issue.assignee ?? ""} onChange={(v) => patch({ assignee: v || null })} options={[["", "Unassigned"], ...[...new Set([...members, ...(issue.assignee ? [issue.assignee] : [])])].map((t) => [t, t] as [string, string])]} />
          ) : (
            <span>{issue.assignee ?? "Unassigned"}</span>
          )}
          <span className="text-ink-3">Reporter</span>
          <span className="flex items-center gap-1.5 text-ink-2">
            <Avatar name={issue.reporterName} size={18} />
            {issue.reporterName}
            {issue.reporterType === "guest" && <span className="rounded bg-surface-2 px-1 text-[10px] text-ink-3">guest</span>}
            <span className="text-ink-3">· <Ago iso={issue.createdAt} /></span>
          </span>
        </div>

        {/* workflow actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <WorkflowActions issue={issue} guest={!!guest} onSet={(s) => patch({ status: s })} />
          {isMember && <NotionIssueButton issueId={issue.id} />}
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-4 border-b border-line px-4 text-[13px]">
        {(["thread", "context"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 py-2.5 capitalize", tab === t ? "border-brand font-medium text-ink" : "border-transparent text-ink-3")}>
            {t === "thread" ? `Thread (${comments.length})` : "Context"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "thread" ? (
          <div className="space-y-3 p-4">
            {history.length > 0 && (
              <button onClick={() => setShowActivity((v) => !v)} className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink">
                <ChevronDown size={13} className={cn("transition", showActivity && "rotate-180")} />
                {showActivity ? "Hide activity" : `Show activity (${history.length})`}
              </button>
            )}
            {timeline.length === 0 && <p className="text-sm text-ink-3">No replies yet.</p>}
            {timeline.map((t) =>
              t.kind === "comment" ? (
                <div key={t.c.id} className="group flex gap-2.5">
                  <Avatar name={t.c.author} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[12px] text-ink-3">
                      <span className="font-medium text-ink">{t.c.author}</span>
                      {t.c.authorType === "guest" && " · guest"} · <Ago iso={t.c.createdAt} />
                      {t.c.editedAt && <span>· edited</span>}
                      {editingReply !== t.c.id && (canEditReply(t.c) || canDeleteReply(t.c)) && (
                        <span className="ml-auto flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          {canEditReply(t.c) && (
                            <button
                              title="Edit reply"
                              onClick={() => {
                                setReplyDraft(t.c.body);
                                setEditingReply(t.c.id);
                              }}
                              className="rounded p-1 hover:bg-surface-2 hover:text-ink"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDeleteReply(t.c) && (
                            <button title="Delete reply" onClick={() => deleteReply(t.c)} className="rounded p-1 hover:bg-surface-2 hover:text-danger">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    {editingReply === t.c.id ? (
                      <div className="mt-1">
                        <textarea
                          autoFocus
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveReply(t.c);
                            }
                            if (e.key === "Escape") setEditingReply(null);
                          }}
                          rows={2}
                          className="block w-full resize-y rounded-lg border border-blue bg-paper px-2.5 py-1.5 text-[14px] outline-none"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setEditingReply(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => saveReply(t.c)} disabled={!replyDraft.trim()}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{t.c.body}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={t.a.id} className="flex items-center gap-2 pl-1 text-[12px] text-ink-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                  <ActivityLine a={t.a} />
                </div>
              ),
            )}
          </div>
        ) : (
          <ContextPanel issue={issue} />
        )}
      </div>

      {/* composer */}
      <form onSubmit={send} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-ink-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="Reply…  (Ctrl+Enter to send)"
            rows={1}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] outline-none [field-sizing:content]"
          />
          <button disabled={sending || !reply.trim()} className="rounded-lg bg-ink p-1.5 text-paper disabled:opacity-30" title="Send">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

function WorkflowActions({ issue, guest, onSet }: { issue: Issue; guest: boolean; onSet: (s: Status) => void }) {
  const s = issue.status;
  if (guest) {
    if (s === "verified") return <Button size="sm" variant="secondary" onClick={() => onSet("open")}><RotateCcw size={13} /> Reopen</Button>;
    return (
      <>
        <Button size="sm" variant="ink" onClick={() => onSet("verified")}>
          <BadgeCheck size={14} /> Approve
        </Button>
        {s !== "fixed" && <Button size="sm" variant="secondary" onClick={() => onSet("fixed")}>Mark resolved</Button>}
      </>
    );
  }
  switch (s) {
    case "open":
      return <><Button size="sm" variant="ink" onClick={() => onSet("in_progress")}>Start work</Button><Button size="sm" variant="secondary" onClick={() => onSet("fixed")}>Mark fixed</Button></>;
    case "in_progress":
      return <><Button size="sm" variant="ink" onClick={() => onSet("fixed")}>Mark fixed</Button><Button size="sm" variant="secondary" onClick={() => onSet("in_review")}>Send to review</Button></>;
    case "in_review":
      return <><Button size="sm" variant="ink" onClick={() => onSet("fixed")}>Mark fixed</Button><Button size="sm" variant="secondary" onClick={() => onSet("in_progress")}>Back to in progress</Button></>;
    case "fixed":
      return (
        <>
          <Button size="sm" variant="success" onClick={() => onSet("verified")}>
            <BadgeCheck size={14} /> Verify fix
          </Button>
          <Button size="sm" variant="danger" onClick={() => onSet("open")}>
            <RotateCcw size={13} /> Reopen: not fixed
          </Button>
        </>
      );
    default:
      return <Button size="sm" variant="secondary" onClick={() => onSet("open")}><RotateCcw size={13} /> Reopen</Button>;
  }
}

function ActivityLine({ a }: { a: Activity }) {
  const lbl = (v: string | null) => (v && v in STATUS_LABEL ? STATUS_LABEL[v as Status] : v ?? "nobody");
  const text =
    a.type === "created" ? "created this issue"
    : a.type === "status" ? <>moved <b className="font-medium text-ink-2">{lbl(a.fromVal)}</b> → <b className="font-medium text-ink-2">{lbl(a.toVal)}</b></>
    : a.type === "priority" ? <>set priority to <b className="font-medium text-ink-2">{a.toVal}</b></>
    : a.type === "assignee" ? <>assigned to <b className="font-medium text-ink-2">{a.toVal ?? "nobody"}</b></>
    : "commented";
  return (
    <span>
      <span className="text-ink-2">{a.actor}</span> {text} · <Ago iso={a.createdAt} />
    </span>
  );
}

function ContextPanel({ issue }: { issue: Issue }) {
  const el = issue.element;
  const env = issue.env;
  const copy = (t: string) => navigator.clipboard?.writeText(t);
  return (
    <div className="space-y-5 p-4 text-[13px]">
      <div>
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-3">Selector</div>
        {issue.selector ? (
          <button onClick={() => copy(issue.selector!)} className="group flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left font-mono text-[12px] text-blue">
            <span className="min-w-0 flex-1 truncate">{issue.selector}</span>
            <Copy size={12} className="text-ink-3 opacity-0 group-hover:opacity-100" />
          </button>
        ) : (
          <span className="text-ink-3">Position-only pin</span>
        )}
        <div className="mt-1.5 font-mono text-[11px] text-ink-3">
          {issue.pageUrl} · {issue.device} · {issue.viewportW}px
        </div>
      </div>
      {el && (
        <div>
          <div className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-3">Element</div>
          <SpecTable el={el} />
        </div>
      )}
      {env && (
        <div>
          <div className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-3">Environment</div>
          <dl className="grid grid-cols-[90px_1fr] gap-y-1 font-mono text-[12px]">
            <dt className="text-ink-3">browser</dt><dd>{env.browser}</dd>
            <dt className="text-ink-3">os</dt><dd>{env.os}</dd>
            <dt className="text-ink-3">dpr</dt><dd>{env.dpr}x</dd>
            <dt className="text-ink-3">url</dt><dd className="truncate" title={env.url}>{env.url}</dd>
          </dl>
          <div className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-3">Console ({env.consoleErrors?.length ?? 0})</div>
          {env.consoleErrors?.length ? (
            <div className="space-y-1 rounded-lg border border-brand/25 bg-accent-soft p-2.5 font-mono text-[11.5px] text-accent-ink">
              {env.consoleErrors.map((c, i) => <div key={i} className="break-all">✕ {c}</div>)}
            </div>
          ) : (
            <div className="text-ink-3">No errors captured.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function SpecTable({ el }: { el: NonNullable<Issue["element"]> & { margin?: string; radius?: string } }) {
  const aa = el.contrast != null ? (el.contrast >= 7 ? "AAA" : el.contrast >= 4.5 ? "AA" : el.contrast >= 3 ? "AA large" : "Fail") : null;
  const rows: [string, React.ReactNode][] = [
    ["tag", `<${el.tag}>`],
    ["size", `${el.width} × ${el.height}`],
    ["font", el.font],
    ["type", `${el.size} / ${el.lineHeight} · ${el.weight}`],
    ["color", <Swatch key="c" c={el.color} />],
    ["background", <Swatch key="b" c={el.bg} />],
    ["contrast", el.contrast != null ? <span key="k">{el.contrast}:1 <span className={cn("ml-1 rounded px-1 text-[10px]", aa === "Fail" ? "bg-danger-soft text-danger" : "bg-[color-mix(in_srgb,var(--st-verified)_14%,transparent)] text-[var(--st-verified)]")}>{aa}</span></span> : "—"],
    ["padding", el.padding],
  ];
  if (el.margin) rows.push(["margin", el.margin]);
  if (el.radius && el.radius !== "0px") rows.push(["radius", el.radius]);
  return (
    <dl className="grid grid-cols-[90px_1fr] gap-y-1 font-mono text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="truncate">{v}</dd>
        </div>
      ))}
      {el.text && (
        <>
          <dt className="text-ink-3">text</dt>
          <dd className="truncate font-sans" title={el.text}>“{el.text}”</dd>
        </>
      )}
    </dl>
  );
}

function toHex(c: string) {
  const m = c.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return c;
  return "#" + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function Swatch({ c }: { c: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm border border-line" style={{ background: c }} />
      {toHex(c)}
    </span>
  );
}

function Select({ value, onChange, options, dot, prio }: { value: string; onChange: (v: string) => void; options: [string, string][]; dot?: boolean; prio?: boolean }) {
  return (
    <label className="relative inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-surface-2">
      {dot && <StatusDot status={value as Status} />}
      {prio && <PriorityIcon priority={value as Issue["priority"]} />}
      <span className="text-ink">{options.find((o) => o[0] === value)?.[1]}</span>
      <ChevronDown size={12} className="text-ink-3" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Attachments({ items }: { items: Attachment[] }) {
  const images = items.filter((a) => a.mime.startsWith("image/"));
  const audio = items.filter((a) => a.mime.startsWith("audio/"));
  const docs = items.filter((a) => !a.mime.startsWith("image/") && !a.mime.startsWith("audio/"));
  return (
    <div className="mt-3 space-y-2">
      {audio.map((a) => (
        <div key={a.id} className="rounded-lg border border-line bg-surface-2 p-2">
          <div className="mb-1 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Voice note</div>
          <audio controls preload="metadata" src={a.url} className="h-8 w-full" />
        </div>
      ))}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {images.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line" title={a.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="aspect-square w-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      )}
      {docs.map((a) => (
        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[13px] text-ink-2 hover:border-line-strong">
          <FileText size={14} /> <span className="truncate">{a.name}</span>
        </a>
      ))}
    </div>
  );
}
