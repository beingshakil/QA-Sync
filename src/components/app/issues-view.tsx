"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Crosshair, LayoutGrid, List, Search } from "lucide-react";
import { api } from "@/lib/api";
import { STATUSES, STATUS_LABEL, type Issue, type Status } from "@/lib/types";
import { Avatar, PriorityIcon, StatusBadge, StatusDot, Ago } from "@/components/ui";
import { IssueDetail } from "./issue-detail";
import { cn } from "@/lib/utils";

const PRIO_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export function IssuesView({ initial, projectId, projects, members = [], me }: { initial: Issue[]; projectId?: string; projects?: { id: string; name: string }[]; members?: string[]; me?: string }) {
  const [issues, setIssues] = useState(initial);
  const [view, setView] = useState<"list" | "board">("list");
  const [status, setStatus] = useState<Status | "active" | "all">("active");
  const [assignee, setAssignee] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "priority">("priority");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("qasync-issues-view");
      if (v === "board" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = (v: "list" | "board") => {
    setView(v);
    try {
      localStorage.setItem("qasync-issues-view", v);
    } catch {}
  };

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        setIssues(await api.issues(projectId ? { projectId } : {}));
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [projectId]);

  const filtered = useMemo(() => {
    let xs = issues;
    if (view === "list") {
      if (status === "active") xs = xs.filter((i) => !["verified", "wont_fix"].includes(i.status));
      else if (status !== "all") xs = xs.filter((i) => i.status === status);
    }
    if (assignee) xs = xs.filter((i) => (assignee === "none" ? !i.assignee : i.assignee === assignee));
    if (project) xs = xs.filter((i) => i.projectId === project);
    if (q.trim()) {
      const s = q.toLowerCase();
      xs = xs.filter((i) => i.title.toLowerCase().includes(s) || i.body.toLowerCase().includes(s) || `#${i.number}` === s);
    }
    return [...xs].sort((a, b) => (sort === "priority" ? PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  }, [issues, status, assignee, project, q, sort, view]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, all: issues.length };
    for (const i of issues) {
      c[i.status] = (c[i.status] ?? 0) + 1;
      if (!["verified", "wont_fix"].includes(i.status)) c.active++;
    }
    return c;
  }, [issues]);

  async function move(id: string, to: Status) {
    const cur = issues.find((i) => i.id === id);
    if (!cur || cur.status === to) return;
    setIssues((xs) => xs.map((x) => (x.id === id ? { ...x, status: to } : x)));
    try {
      await api.updateIssue(id, { status: to });
    } catch (e) {
      alert((e as Error).message);
      setIssues((xs) => xs.map((x) => (x.id === id ? cur : x)));
    }
  }

  const open = issues.find((i) => i.id === openId);

  return (
    <div className="min-w-0">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search size={14} className="text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search issues or #number" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        {projects && (
          <select value={project} onChange={(e) => setProject(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
          <option value="">Anyone</option>
          <option value="none">Unassigned</option>
          {members.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "priority")} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
          <option value="priority">Sort: priority</option>
          <option value="newest">Sort: newest</option>
        </select>
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          <button onClick={() => changeView("list")} className={cn("rounded-md p-1.5", view === "list" ? "bg-ink text-paper" : "text-ink-3")} title="List">
            <List size={15} />
          </button>
          <button onClick={() => changeView("board")} className={cn("rounded-md p-1.5", view === "board" ? "bg-ink text-paper" : "text-ink-3")} title="Board">
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {view === "list" && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
          {(["active", ...STATUSES, "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1", status === s ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-line-strong")}
            >
              {s !== "active" && s !== "all" && <StatusDot status={s} />}
              {s === "active" ? "Active" : s === "all" ? "All" : STATUS_LABEL[s]}
              <span className="font-mono opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {/* list */}
      {view === "list" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-3">No issues match these filters.</p>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setOpenId(i.id)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60", openId === i.id && "bg-surface-2")}>
                    <PriorityIcon priority={i.priority} />
                    <span className="w-9 shrink-0 font-mono text-[12px] text-ink-3">#{i.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{i.title}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                        {!projectId && `${i.projectName} · `}
                        {i.reporterName}
                        {i.reporterType === "guest" && " (guest)"} · <Ago iso={i.createdAt} />
                        {!!i.commentCount && ` · ${i.commentCount} replies`}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusBadge status={i.status} />
                    </span>
                    {i.assignee ? <Avatar name={i.assignee} size={22} /> : <span className="h-[22px] w-[22px] rounded-full border border-dashed border-line-strong" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((s) => {
            const col = filtered.filter((i) => i.status === s);
            return (
              <div
                key={s}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragId && move(dragId, s)}
                className="flex w-64 shrink-0 flex-col rounded-2xl border border-line bg-surface-2/60"
              >
                <div className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium">
                  <StatusDot status={s} />
                  {STATUS_LABEL[s]}
                  <span className="font-mono text-[12px] text-ink-3">{col.length}</span>
                </div>
                <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                  {col.map((i) => (
                    <div
                      key={i.id}
                      draggable
                      onDragStart={() => setDragId(i.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpenId(i.id)}
                      className={cn("cursor-grab rounded-xl border border-line bg-surface p-3 shadow-1 transition hover:border-line-strong active:cursor-grabbing", dragId === i.id && "opacity-50")}
                    >
                      <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
                        <PriorityIcon priority={i.priority} />
                        <span className="font-mono">#{i.number}</span>
                        {!projectId && <span className="truncate">{i.projectName}</span>}
                        <span className="ml-auto">{i.assignee && <Avatar name={i.assignee} size={18} />}</span>
                      </div>
                      <div className="mt-1.5 line-clamp-3 text-[13.5px] leading-snug">{i.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/20 backdrop-blur-[1px]" onClick={() => setOpenId(null)}>
          <div className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/app/projects/${open.projectId}/review?issue=${open.id}`}
              className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 text-[13px] font-medium text-accent-ink hover:bg-accent-soft"
            >
              <Crosshair size={14} /> Open on the page
            </Link>
            <div className="min-h-0 flex-1">
              <IssueDetail
                key={open.id}
                issueId={open.id}
                members={members}
                me={me}
                onClose={() => setOpenId(null)}
                onChange={(u) => setIssues((xs) => xs.map((x) => (x.id === u.id ? { ...x, ...u } : x)))}
                onDeleted={(id) => {
                  setIssues((xs) => xs.filter((x) => x.id !== id));
                  setOpenId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
