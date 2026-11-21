"use client";

import Link from "next/link";
import { ThemeToggle } from "./app-theme";
import { useEffect, useState } from "react";
import { FolderKanban, Gauge, ListChecks, PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/issues", label: "Issues", icon: ListChecks },
  { href: "/app/audits", label: "Audits", icon: Gauge },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const KEY = "qasync-canvas-rail";

/**
 * Slim navigation rail for the review canvas: jump to Projects, Issues… or another project
 * without leaving the canvas. Collapsed to icons by default; expands to show labels (remembered).
 */
type RailProject = { id: string; name: string; color: string; openCount?: number; host?: string | null };

/**
 * The site's own logo (its favicon, found by Google's favicon service), on a white tile so dark
 * and light logos both read. Falls back to the coloured initials when the site has no icon.
 */
function ProjectIcon({ p, active }: { p: RailProject; active: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = p.name.replace(/^https?:\/\//, "").slice(0, 2).toUpperCase();
  const logo = p.host && !failed ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(p.host)}&sz=64` : null;
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md text-[11px] font-semibold text-white",
        active && "ring-2 ring-offset-2 ring-offset-surface",
      )}
      style={{ background: logo ? "#fff" : p.color, ...(active ? { ["--tw-ring-color" as string]: p.color } : {}) }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-5 w-5 object-contain"
          // Google answers an unknown site with a 16px generic globe: treat that as "no logo".
          onLoad={(e) => e.currentTarget.naturalWidth <= 16 && setFailed(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function CanvasRail({ projects, currentId }: { projects: RailProject[]; currentId: string }) {
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
    <aside className={cn("relative z-30 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex", open ? "w-56" : "w-14")}>
      {/* Collapse/expand handle on the rail's edge, halfway down, so it's always within reach. */}
      <button
        onClick={toggle}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={open}
        className="absolute -right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-3 shadow-1 transition hover:border-blue hover:text-ink"
      >
        {open ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>
      <div className={cn("flex h-14 shrink-0 items-center border-b border-line", open ? "gap-2 px-4" : "justify-center")}>
        <Link href="/app/projects" title="QASync home" className="flex items-center gap-2 font-semibold">
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
              <ProjectIcon p={p} active={active} />
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
      <div className={cn("flex border-t border-line p-2", open ? "justify-end px-3" : "justify-center")}>
        <ThemeToggle size={16} className="p-2" />
      </div>
    </aside>
  );
}
