"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, LayoutList, Plus, RotateCcw, X } from "lucide-react";
import { PAGE_STATE_COLOR, PAGE_STATE_LABEL, type Page } from "@/lib/types";
import { cn, pageLabel, pagePath } from "@/lib/utils";

export function PageTabs({
  pages,
  currentKey,
  onSelect,
  onAdd,
  onOverview,
  onSignOff,
  canAdd,
}: {
  pages: Page[];
  currentKey: string;
  onSelect: (p: Page) => void;
  onAdd: (url: string) => Promise<void>;
  onOverview: () => void;
  onSignOff: (p: Page, done: boolean) => void;
  canAdd: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const current = pages.find((p) => p.key === currentKey);
  const passed = pages.filter((p) => p.state === "passed").length;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentKey]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      await onAdd(value.trim());
      setValue("");
      setAdding(false);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-surface pl-2 pr-2 sm:pr-3">
      <button
        onClick={onOverview}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        title="All pages and their QA status"
        aria-label="All pages"
      >
        <LayoutList size={14} />
        <span className="hidden sm:inline">Pages</span>
        <span className="font-mono text-[11.5px] text-ink-3">
          {passed}/{pages.length}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:thin]">
        {pages.map((p) => {
          const active = p.key === currentKey;
          return (
            <button
              key={p.id}
              ref={active ? activeRef : undefined}
              onClick={() => onSelect(p)}
              title={`${pagePath(p.url)} · ${PAGE_STATE_LABEL[p.state]}`}
              className={cn(
                "flex h-8 max-w-[140px] shrink-0 sm:max-w-[220px] items-center gap-2 rounded-lg px-2.5 text-[13px] transition",
                active ? "bg-ink font-medium text-paper" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PAGE_STATE_COLOR[p.state] }} />
              <span className="truncate">{pageLabel(p)}</span>
              {p.state === "passed" ? (
                <BadgeCheck size={13} className={active ? "text-[#5fe0a2]" : "text-[var(--st-verified)]"} />
              ) : p.open > 0 ? (
                <span className={cn("rounded-full px-1.5 font-mono text-[11px]", active ? "bg-paper/20" : "bg-surface-2 text-ink-2")}>{p.open}</span>
              ) : null}
            </button>
          );
        })}

        {canAdd &&
          (adding ? (
            <form onSubmit={add} className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-blue bg-paper pl-2">
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                placeholder="/pricing"
                className="w-36 bg-transparent font-mono text-[12.5px] outline-none"
              />
              <button className="px-2 text-[12.5px] font-medium text-blue">Add</button>
              <button type="button" onClick={() => setAdding(false)} className="pr-1.5 text-ink-3 hover:text-ink">
                <X size={13} />
              </button>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} aria-label="Add page" title="Add page" className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-blue hover:bg-blue-soft sm:px-2.5">
              <Plus size={14} /> <span className="hidden sm:inline">Add page</span>
            </button>
          ))}
        {err && <span className="shrink-0 text-[12px] text-accent-ink">{err}</span>}
      </div>

      {/* sign-off for the page being viewed */}
      {current && (
        <div className="flex shrink-0 items-center gap-2 border-l border-line pl-2 sm:pl-3">
          {current.state === "passed" ? (
            <>
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--st-verified)]">
                <BadgeCheck size={14} /> <span className="hidden sm:inline">QA passed{current.qaBy ? ` · ${current.qaBy}` : ""}</span>
              </span>
              <button onClick={() => onSignOff(current, false)} className="rounded p-1 text-ink-3 hover:text-ink" title="Undo sign-off">
                <RotateCcw size={13} />
              </button>
            </>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-3 xl:flex">
                <span className="h-2 w-2 rounded-full" style={{ background: PAGE_STATE_COLOR[current.state] }} />
                {PAGE_STATE_LABEL[current.state]}
              </span>
              <button
                onClick={() => onSignOff(current, true)}
                disabled={current.open > 0}
                title={current.open > 0 ? `Resolve the ${current.open} open issue${current.open === 1 ? "" : "s"} on this page first` : "Sign this page off as QA passed"}
                aria-label="Mark page passed"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--st-verified)] px-2.5 text-[12.5px] font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-35 sm:px-3"
              >
                <BadgeCheck size={14} /> <span className="hidden sm:inline">Mark page passed</span><span className="sm:hidden">Pass</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
