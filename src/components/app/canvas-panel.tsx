"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow, Check, CheckSquare, ChevronDown, Link2, X, Loader2, MessageSquarePlus, Monitor, MoreHorizontal, Paperclip, Pencil, Search, Smartphone, Tablet, Trash2 } from "lucide-react";
import { PRIORITIES, PRIORITY_COLOR, PRIORITY_LABEL, SOLVED_COLOR, STATUSES, STATUS_LABEL, issueColor, issueTextColor, type Issue, type Priority, type Status } from "@/lib/types";
import { Avatar, Kbd, PriorityIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SortKey = "newest" | "oldest" | "priority" | "number";
export type DeviceFilter = "all" | "desktop" | "tablet" | "mobile";
export const DONE: Status[] = ["fixed", "verified", "wont_fix"];

export interface PanelFilters {
  q: string;
  sort: SortKey;
  device: DeviceFilter;
  showResolved: boolean;
  scope: "page" | "project";
}

const SORT_LABEL: Record<SortKey, string> = { newest: "Newest first", oldest: "Oldest first", priority: "Priority", number: "Pin number" };


export function CanvasPanel({
  list,
  scopeCount,
  doneCount,
  totalCount,
  deviceCounts,
  filters,
  setFilters,
  onSelect,
  onOpen,
  focusedId,
  onPatch,
  statusOptions,
  members,
  canMeta,
  linkFor,
  onToggleDone,
  showPageName,
  canEdit,
  onEdit,
  onDelete,
  bulk,
}: {
  list: Issue[];
  scopeCount: number;
  doneCount: number;
  totalCount: number;
  deviceCounts: Record<DeviceFilter, number>;
  filters: PanelFilters;
  setFilters: (f: Partial<PanelFilters>) => void;
  /** Card click: highlight the comment and point at its pin. */
  onSelect: (id: string) => void;
  /** Open the full thread / detail panel. */
  onOpen: (id: string) => void;
  focusedId: string | null;
  onPatch: (i: Issue, patch: { status?: Status; priority?: Priority; assignee?: string | null }) => Promise<void>;
  statusOptions: Status[];
  members: string[];
  canMeta: boolean;
  linkFor: (i: Issue) => string;
  onToggleDone: (issue: Issue) => void;
  showPageName: (i: Issue) => boolean;
  canEdit: (i: Issue) => boolean;
  onEdit: (i: Issue, text: string) => Promise<void>;
  onDelete: (i: Issue) => void;
  /** Bulk editing (members only). */
  bulk?: {
    members: string[];
    onUpdate: (ids: string[], patch: { status?: Status; priority?: Priority; assignee?: string | null }) => Promise<void>;
    onDelete: (ids: string[]) => Promise<boolean>;
  };
}) {
  const [menu, setMenu] = useState<"sort" | "scope" | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Drop selections that are no longer in the list (filtered out or deleted).
  const visibleIds = list.map((i) => i.id).join(",");
  useEffect(() => {
    setPicked((cur) => {
      const ids = new Set(visibleIds.split(",").filter(Boolean));
      const next = new Set([...cur].filter((x) => ids.has(x)));
      return next.size === cur.size ? cur : next;
    });
  }, [visibleIds]);
  const togglePick = (id: string) =>
    setPicked((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allPicked = list.length > 0 && list.every((i) => picked.has(i.id));
  const exitSelect = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  async function applyBulk(patch: { status?: Status; priority?: Priority; assignee?: string | null }) {
    if (!bulk || !picked.size) return;
    setBulkBusy(true);
    try {
      await bulk.onUpdate([...picked], patch);
    } finally {
      setBulkBusy(false);
    }
  }
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={menuRef} className="relative space-y-3 border-b border-line p-3">
        {/* search + sort */}
        <div className="flex gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-2.5 focus-within:border-ink-3">
            <Search size={14} className="shrink-0 text-ink-3" />
            <input
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              placeholder="Search comments…"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </label>
          {bulk && (
            <button
              onClick={() => (selecting ? exitSelect() : setSelecting(true))}
              title={selecting ? "Stop selecting" : "Select several to update at once"}
              aria-pressed={selecting}
              className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", selecting ? "border-blue bg-blue-soft text-blue" : "border-line text-ink-2 hover:text-ink")}
            >
              <CheckSquare size={15} />
            </button>
          )}
          <button
            onClick={() => setMenu(menu === "sort" ? null : "sort")}
            title={`Sort: ${SORT_LABEL[filters.sort]}`}
            className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", menu === "sort" ? "border-ink-3 text-ink" : "border-line text-ink-2 hover:text-ink")}
          >
            <ArrowDownWideNarrow size={15} />
          </button>
        </div>

        {/* progress */}
        <button
          onClick={() => setMenu(menu === "scope" ? null : "scope")}
          className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-surface-2/60"
        >
          <span className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-line">
            <span className="absolute inset-y-0 left-0 rounded-full bg-grad-brand" style={{ width: `${Math.max(pct, 4)}%` }} />
            <span className="absolute inset-y-0 rounded-full bg-[var(--st-verified)]" style={{ left: `${Math.max(pct, 4)}%`, width: 3 }} />
          </span>
          <span className="text-[13px]">
            <b className="font-semibold">{scopeCount}</b> <span className="text-ink-3">· {filters.scope === "page" ? "This page" : "All pages"}</span>
          </span>
          <span className="ml-auto font-mono text-[12px] text-ink-3">
            {doneCount}/{totalCount} done
          </span>
          <ChevronDown size={14} className={cn("text-ink-3 transition", menu === "scope" && "rotate-180")} />
        </button>

        {/* device chips */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All", null],
              ["desktop", "Desktop", <Monitor key="d" size={12} />],
              ["tablet", "Tablet", <Tablet key="t" size={12} />],
              ["mobile", "Mobile", <Smartphone key="m" size={12} />],
            ] as const
          )
            .filter(([k]) => k !== "tablet" || deviceCounts.tablet > 0 || filters.device === "tablet")
            .map(([k, label, icon]) => (
              <button
                key={k}
                onClick={() => setFilters({ device: k })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium",
                  filters.device === k ? "border-blue bg-blue-soft text-blue" : "border-line text-ink-2 hover:border-line-strong",
                )}
              >
                {icon}
                {label}
                <span className="font-mono opacity-70">{deviceCounts[k]}</span>
              </button>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
          {(["urgent", "high", "medium", "low"] as const).map((p) => (
            <span key={p} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
              {PRIORITY_LABEL[p]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: SOLVED_COLOR }} />
            Solved
          </span>
        </div>

        {menu && (
          <div className={cn("animate-pop absolute right-3 z-20 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2", menu === "sort" ? "top-14" : "top-[100px]")}>
            {menu === "sort" ? (
              <>
                <div className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Sort by</div>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <MenuRow key={k} active={filters.sort === k} onClick={() => { setFilters({ sort: k }); setMenu(null); }}>
                    {SORT_LABEL[k]}
                  </MenuRow>
                ))}
                <div className="my-1 border-t border-line" />
                <MenuRow active={filters.showResolved} onClick={() => setFilters({ showResolved: !filters.showResolved })}>
                  Show resolved
                </MenuRow>
              </>
            ) : (
              <>
                <MenuRow active={filters.scope === "page"} onClick={() => { setFilters({ scope: "page" }); setMenu(null); }}>
                  This page
                </MenuRow>
                <MenuRow active={filters.scope === "project"} onClick={() => { setFilters({ scope: "project" }); setMenu(null); }}>
                  All pages
                </MenuRow>
              </>
            )}
          </div>
        )}
      </div>

      {/* list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {list.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <MessageSquarePlus size={18} />
            </div>
            <p className="mt-3 font-medium">{filters.q ? "No comments match" : "No comments yet"}</p>
            <p className="mt-1 text-sm text-ink-3">
              Press <Kbd>C</Kbd> and click anything on the page.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {selecting && (
              <li>
                <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1 text-[12.5px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={allPicked}
                    onChange={() => setPicked(allPicked ? new Set() : new Set(list.map((i) => i.id)))}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  Select all ({list.length})
                </label>
              </li>
            )}
            {list.map((i) => (
              <li key={i.id} className="animate-in-up">
                <CommentCard
                  selecting={selecting}
                  picked={picked.has(i.id)}
                  onPick={() => togglePick(i.id)}
                  issue={i}
                  focused={focusedId === i.id}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onPatch={onPatch}
                  statusOptions={statusOptions}
                  members={members}
                  canMeta={canMeta}
                  linkFor={linkFor}
                  onToggleDone={onToggleDone}
                  canEdit={canEdit(i)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  pageName={showPageName(i) ? i.pageUrl : null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {selecting && bulk ? (
        <div className="space-y-2 border-t border-line bg-surface-2/60 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12.5px]">
            <b className="font-semibold">{picked.size}</b>
            <span className="text-ink-3">selected</span>
            {bulkBusy && <Loader2 size={13} className="animate-spin text-ink-3" />}
            <button onClick={exitSelect} className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-ink-3 hover:text-ink">
              <X size={13} /> Done
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <BulkSelect
              label="Status"
              disabled={!picked.size || bulkBusy}
              options={STATUSES.map((st) => [st, STATUS_LABEL[st]] as [string, string])}
              onPick={(v) => applyBulk({ status: v as Status })}
            />
            <BulkSelect
              label="Priority"
              disabled={!picked.size || bulkBusy}
              options={PRIORITIES.map((pr) => [pr, PRIORITY_LABEL[pr]] as [string, string])}
              onPick={(v) => applyBulk({ priority: v as Priority })}
            />
            <BulkSelect
              label="Assignee"
              disabled={!picked.size || bulkBusy}
              options={[["__none", "Unassigned"], ...bulk.members.map((m) => [m, m] as [string, string])]}
              onPick={(v) => applyBulk({ assignee: v === "__none" ? null : v })}
            />
          </div>
          <button
            disabled={!picked.size || bulkBusy}
            onClick={async () => {
              setBulkBusy(true);
              try {
                if (await bulk.onDelete([...picked])) setPicked(new Set());
              } finally {
                setBulkBusy(false);
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface py-1.5 text-[12.5px] text-danger hover:bg-danger-soft disabled:opacity-40"
          >
            <Trash2 size={13} /> Delete selected
          </button>
        </div>
      ) : (
      <div className="hidden flex-wrap gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-[11px] text-ink-3 md:flex">
        <span><Kbd>C</Kbd> comment</span>
        <span><Kbd>I</Kbd> inspect</span>
        <span><Kbd>F</Kbd> freeze</span>
        <span><Kbd>J</Kbd>/<Kbd>K</Kbd> next/prev</span>
      </div>
      )}
    </div>
  );
}

/** A select that applies a value to all picked issues, then resets to its label. */
function BulkSelect({ label, options, onPick, disabled }: { label: string; options: [string, string][]; onPick: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      value=""
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
      }}
      className="h-8 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink disabled:opacity-40"
      aria-label={`Set ${label.toLowerCase()} for selected`}
    >
      <option value="" disabled>
        {label}…
      </option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function MenuRow({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-surface-2">
      {children}
      {active && <Check size={14} className="text-blue" />}
    </button>
  );
}

/**
 * One comment in the panel. Clicking the card only highlights it and points at its pin;
 * everything else (status, priority, assignee, thread, edit, link, delete) lives in the ⋯ menu.
 */
function CommentCard({
  selecting = false,
  picked = false,
  onPick,
  focused = false,
  issue: i,
  onSelect,
  onOpen,
  onToggleDone,
  onPatch,
  statusOptions,
  members,
  canMeta,
  linkFor,
  canEdit,
  onEdit,
  onDelete,
  pageName,
}: {
  selecting?: boolean;
  picked?: boolean;
  onPick?: () => void;
  focused?: boolean;
  issue: Issue;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleDone: (issue: Issue) => void;
  onPatch: (i: Issue, patch: { status?: Status; priority?: Priority; assignee?: string | null }) => Promise<void>;
  statusOptions: Status[];
  members: string[];
  /** Members can change priority and assignee; guests only status. */
  canMeta: boolean;
  linkFor: (i: Issue) => string;
  canEdit: boolean;
  onEdit: (i: Issue, text: string) => Promise<void>;
  onDelete: (i: Issue) => void;
  pageName: string | null;
}) {
  const done = DONE.includes(i.status);
  const [menu, setMenu] = useState<null | "down" | "up">(null);
  const [sub, setSub] = useState<null | "status" | "priority" | "assignee">(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(i.body || i.title);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setMenu(null);
        setSub(null);
      }
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setMenu(null), setSub(null));
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  // Keep the highlighted card in view (pin clicks, J/K).
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  function openMenu() {
    if (menu) {
      setMenu(null);
      setSub(null);
      return;
    }
    // Open upwards when the card sits low in the panel, so the menu isn't clipped.
    const r = ref.current?.getBoundingClientRect();
    setMenu(r && r.bottom > window.innerHeight - 340 ? "up" : "down");
  }

  async function patch(p: { status?: Status; priority?: Priority; assignee?: string | null }) {
    setBusy(true);
    try {
      await onPatch(i, p);
      setMenu(null);
      setSub(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!text.trim()) return setErr("A comment can't be empty.");
    setSaving(true);
    setErr(null);
    try {
      await onEdit(i, text.trim());
      setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const date = new Date(i.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => (selecting ? onPick?.() : !editing && onSelect(i.id))}
      onKeyDown={(e) => e.key === "Enter" && (selecting ? onPick?.() : !editing && onSelect(i.id))}
      aria-pressed={selecting ? picked : undefined}
      aria-current={focused || undefined}
      className={cn(
        "group relative rounded-lg border bg-surface px-2.5 py-2 transition",
        selecting && picked && "!border-blue bg-blue-soft/40",
        editing ? "cursor-default border-blue" : "cursor-pointer border-line hover:border-line-strong hover:bg-surface-2/40",
        focused && !selecting && !editing && "!border-blue ring-2 ring-blue/20",
        done && !editing && !focused && "opacity-65",
      )}
    >
      <div className="flex items-start gap-2">
        {selecting && (
          <input
            type="checkbox"
            checked={picked}
            onChange={() => onPick?.()}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
            aria-label={`Select comment ${i.number}`}
          />
        )}
        <span
          className="mt-px flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10.5px] font-semibold"
          style={{ background: issueColor(i), color: issueTextColor(i) }}
          title={done ? "Solved" : PRIORITY_LABEL[i.priority]}
        >
          {i.number}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    save();
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                rows={2}
                className="block w-full resize-none rounded-md border border-line bg-paper px-2 py-1.5 text-[13px] leading-snug outline-none focus:border-blue"
              />
              {err && <p className="mt-1 text-[11.5px] text-danger">{err}</p>}
              <div className="mt-1.5 flex justify-end gap-1">
                <button onClick={() => setEditing(false)} className="rounded px-2 py-0.5 text-[12px] text-ink-2 hover:bg-surface-2">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex items-center gap-1 rounded bg-blue px-2 py-0.5 text-[12px] font-medium text-white disabled:opacity-60">
                  {saving && <Loader2 size={11} className="animate-spin" />} Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={cn("line-clamp-2 text-[13px] leading-[1.35] text-ink", done && "line-through decoration-ink-3")}>{i.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                <span>{date}</span>
                <span aria-hidden>·</span>
                {done ? (
                  <span className="inline-flex items-center gap-1 font-medium" style={{ color: SOLVED_COLOR }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: SOLVED_COLOR }} /> Solved
                  </span>
                ) : (
                  <PriorityIcon priority={i.priority} label />
                )}
                <span aria-hidden>·</span>
                <span className="capitalize">{i.device}</span>
                {i.attachments?.length > 0 && (
                  <span className="inline-flex items-center gap-0.5" title={`${i.attachments.length} attachment${i.attachments.length === 1 ? "" : "s"}`}>
                    · <Paperclip size={10} />
                    {i.attachments.length}
                  </span>
                )}
                {!!i.commentCount && <span>· {i.commentCount} repl{i.commentCount === 1 ? "y" : "ies"}</span>}
                {i.editedAt && <span>· edited</span>}
                {pageName && <span className="truncate font-mono text-[10px]">{pageName}</span>}
                {i.assignee && (
                  <span className="ml-auto" title={`Assigned to ${i.assignee}`}>
                    <Avatar name={i.assignee} size={14} />
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!editing && !selecting && (
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openMenu();
              }}
              title="Options"
              aria-label={`Options for comment ${i.number}`}
              aria-expanded={!!menu}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink",
                menu || focused ? "opacity-100" : "opacity-0 focus:opacity-100 group-hover:opacity-100",
              )}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleDone(i);
              }}
              title={done ? "Reopen" : "Mark resolved"}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border transition",
                done ? "border-[var(--st-verified)] bg-[var(--st-verified)] text-white" : "border-line-strong text-ink-3 hover:border-[var(--st-verified)] hover:text-[var(--st-verified)]",
              )}
            >
              <Check size={12} />
            </button>
          </span>
        )}
      </div>

      {menu && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "animate-pop absolute right-2 z-30 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 text-[12.5px] shadow-2",
            menu === "down" ? "top-8" : "bottom-8",
          )}
        >
          <MenuGroup
            label="Status"
            open={sub === "status"}
            onToggle={() => setSub(sub === "status" ? null : "status")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--st-${i.status === "in_progress" ? "progress" : i.status === "in_review" ? "review" : i.status === "wont_fix" ? "wontfix" : i.status})` }} />
                {STATUS_LABEL[i.status]}
              </span>
            }
          >
            {statusOptions.map((st) => (
              <SubItem key={st} active={i.status === st} onClick={() => patch({ status: st })}>
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--st-${st === "in_progress" ? "progress" : st === "in_review" ? "review" : st === "wont_fix" ? "wontfix" : st})` }} />
                {STATUS_LABEL[st]}
              </SubItem>
            ))}
          </MenuGroup>

          {canMeta && (
            <>
              <MenuGroup label="Priority" open={sub === "priority"} onToggle={() => setSub(sub === "priority" ? null : "priority")} value={<PriorityIcon priority={i.priority} label />}>
                {PRIORITIES.map((pr) => (
                  <SubItem key={pr} active={i.priority === pr} onClick={() => patch({ priority: pr })}>
                    <PriorityIcon priority={pr} label />
                  </SubItem>
                ))}
              </MenuGroup>
              <MenuGroup
                label="Assignee"
                open={sub === "assignee"}
                onToggle={() => setSub(sub === "assignee" ? null : "assignee")}
                value={<span className="max-w-[90px] truncate">{i.assignee ?? "Unassigned"}</span>}
              >
                <SubItem active={!i.assignee} onClick={() => patch({ assignee: null })}>
                  <span className="h-4 w-4 rounded-full border border-dashed border-line-strong" /> Unassigned
                </SubItem>
                {members.map((m) => (
                  <SubItem key={m} active={i.assignee === m} onClick={() => patch({ assignee: m })}>
                    <Avatar name={m} size={16} /> {m}
                  </SubItem>
                ))}
              </MenuGroup>
            </>
          )}

          <div className="my-1 border-t border-line" />
          <MenuAction
            icon={<MessageSquarePlus size={13} />}
            onClick={() => {
              setMenu(null);
              onOpen(i.id);
            }}
          >
            Open thread &amp; reply{i.commentCount ? ` (${i.commentCount})` : ""}
          </MenuAction>
          {canEdit && (
            <MenuAction
              icon={<Pencil size={13} />}
              onClick={() => {
                setMenu(null);
                setText(i.body || i.title);
                setEditing(true);
              }}
            >
              Edit text
            </MenuAction>
          )}
          <MenuAction
            icon={copied ? <Check size={13} /> : <Link2 size={13} />}
            onClick={async () => {
              const url = linkFor(i);
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                  setMenu(null);
                }, 900);
              } catch {
                window.prompt("Copy this link", url);
              }
            }}
          >
            {copied ? "Link copied" : "Copy link"}
          </MenuAction>
          {canEdit && (
            <>
              <div className="my-1 border-t border-line" />
              <MenuAction
                danger
                icon={<Trash2 size={13} />}
                onClick={() => {
                  setMenu(null);
                  onDelete(i);
                }}
              >
                Delete
              </MenuAction>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuGroup({ label, value, open, onToggle, children }: { label: string; value: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2", open && "bg-surface-2")}>
        <span className="w-16 shrink-0 text-ink-3">{label}</span>
        <span className="flex min-w-0 flex-1 items-center text-ink">{value}</span>
        <ChevronDown size={13} className={cn("shrink-0 text-ink-3 transition", open && "rotate-180")} />
      </button>
      {open && <div className="border-y border-line bg-paper py-1">{children}</div>}
    </div>
  );
}

function SubItem({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button role="menuitemradio" aria-checked={active} onClick={onClick} className="flex w-full items-center gap-2 py-1.5 pl-6 pr-3 text-left hover:bg-surface-2">
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {active && <Check size={13} className="shrink-0 text-blue" />}
    </button>
  );
}

function MenuAction({ children, icon, onClick, danger }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left", danger ? "text-danger hover:bg-danger-soft" : "hover:bg-surface-2")}>
      {icon}
      {children}
    </button>
  );
}
