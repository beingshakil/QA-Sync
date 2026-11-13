"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderKanban, Gauge, Inbox, ListChecks, PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui";
import { ThemeToggle } from "./rail";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app", label: "Inbox", icon: Inbox },
  { href: "/app/issues", label: "Issues", icon: ListChecks },
  { href: "/app/audits", label: "Audits", icon: Gauge },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const KEY = "qasync-canvas-rail";

/**
 * Slim navigation rail for the review canvas: jump to Projects, Inbox, Issues… or another project
 * without leaving the canvas. Collapsed to icons by default; expands to show labels (remembered).
 */
export function CanvasRail({ projects, currentId }: { projects: { id: string; name: string; color: string; openCount?: number }[]; currentId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY) === "open");
    } catch {}
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(KEY, o ? "closed" : "open");
      } catch {}
      return !o;
    });
  };

  return (
    <aside className={cn("hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex", open ? "w-56" : "w-14")}>
      <div className={cn("flex h-14 shrink-0 items-center border-b border-line", open ? "gap-2 px-4" : "justify-center")}>
        <Link href="/app" title="QASync home" className="flex items-center gap-2 font-semibold">
          <LogoMark />
          {open && <Wordmark className="text-[16px]" />}
        </Link>
      </div>

      <nav className="space-y-0.5 p-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            title={open ? undefined : n.label}
            className={cn("flex items-center rounded-lg py-2 text-[13.5px] text-ink-2 transition hover:bg-surface-2 hover:text-ink", open ? "gap-2.5 px-2.5" : "justify-center")}
          >
            <n.icon size={17} className="shrink-0 text-ink-3" />
            {open && n.label}
          </Link>
        ))}
      </nav>

      <div className={cn("mt-1 flex items-center border-t border-line pt-3", open ? "justify-between px-4" : "justify-center")}>
        {open && <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Projects</span>}
        <Link href="/app/projects" title="All projects / new project" className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink">
          <Plus size={14} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {projects.map((p) => {
          const active = p.id === currentId;
          return (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}/review`}
              title={open ? undefined : `${p.name}${p.openCount ? ` · ${p.openCount} open` : ""}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg py-1.5 text-[13px] transition",
                open ? "gap-2.5 px-2" : "justify-center",
                active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
              )}
            >
              <span
                className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white", active && "ring-2 ring-offset-2 ring-offset-surface")}
                style={{ background: p.color, ...(active ? { ["--tw-ring-color" as string]: p.color } : {}) }}
              >
                {p.name.replace(/^https?:\/\//, "").slice(0, 2).toUpperCase()}
              </span>
              {open && (
                <>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {!!p.openCount && <span className="font-mono text-[11px] text-ink-3">{p.openCount}</span>}
                </>
              )}
            </Link>
          );
        })}
      </div>

      <div className={cn("flex items-center border-t border-line p-2", open ? "justify-between" : "flex-col gap-1")}>
        <ThemeToggle />
        <button onClick={toggle} title={open ? "Collapse sidebar" : "Expand sidebar"} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
          {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>
    </aside>
  );
}
