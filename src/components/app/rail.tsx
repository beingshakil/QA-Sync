"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Crosshair, FolderKanban, Gauge, Globe, ListChecks, Moon, MoreHorizontal, Pencil, Plus, Settings, Sun, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/confirm";

import { Avatar, LogoMark, Wordmark } from "@/components/ui";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/issues", label: "Issues", icon: ListChecks },
  { href: "/app/audits", label: "Audits", icon: Gauge },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Rail({ projects, workspace }: { projects: { id: string; name: string; color: string; openCount?: number }[]; workspace: Workspace }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LogoMark /> <Wordmark className="text-[17px]" />
        </Link>
      </div>
      <nav className="space-y-0.5 px-2 py-2">
        {NAV.map((n) => {
          const active = path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px]", active ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/60 hover:text-ink")}
            >
              <n.icon size={16} className={active ? "text-accent-ink" : "text-ink-3"} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 flex items-center justify-between px-4">
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Projects</span>
        <Link href="/app/projects" title="All projects" className="rounded p-0.5 text-ink-3 hover:text-ink">
          <Plus size={14} />
        </Link>
      </div>
      <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {projects.map((p) => (
          <ProjectRow key={p.id} p={p} active={path.startsWith(`/app/projects/${p.id}`)} />
        ))}
        {projects.length === 0 && <p className="px-2.5 py-2 text-[12.5px] text-ink-3">No projects yet.</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-line p-3">
        <Link href="/app/settings" className="flex min-w-0 flex-1 items-center gap-2" title="Edit your name and workspace">
          <Avatar name={workspace.userName} size={28} />
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="truncate font-medium">{workspace.userName}</div>
            <div className="truncate text-[11px] text-ink-3">{workspace.name}</div>
          </div>
        </Link>
        <ThemeToggle />
        <Link href="/" title="Marketing site" className="rounded-md p-1.5 text-ink-3 hover:text-ink">
          <Globe size={15} />
        </Link>
      </div>
    </aside>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    window.setTimeout(() => root.classList.remove("theme-switching"), 400);
    try {
      localStorage.setItem("qasync-theme", next);
    } catch {}
    setDark(!dark);
  }
  return (
    <button onClick={toggle} title="Toggle theme" className="rounded-md p-1.5 text-ink-3 hover:text-ink">
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export function MobileTopbar() {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
      <Link href="/app/projects" className="flex items-center gap-2 font-semibold">
        <LogoMark /> <Wordmark className="text-[17px]" />
      </Link>
      <nav className="ml-auto flex gap-3 text-[13px] text-ink-2">
        <Link href="/app/projects">Projects</Link>
        <Link href="/app/issues">Issues</Link>
        <Link href="/app/audits">Audits</Link>
      </nav>
    </div>
  );
}

type RailProject = { id: string; name: string; color: string; openCount?: number };

/** A sidebar project with a ⋯ menu: open canvas, rename inline, settings, delete. */
function ProjectRow({ p, active }: { p: RailProject; active: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const ref = useRef<HTMLDivElement>(null);
  const confirmDialog = useConfirm();

  useEffect(() => setName(p.name), [p.name]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  async function rename(e?: React.FormEvent) {
    e?.preventDefault();
    setEditing(false);
    const n = name.trim();
    if (!n || n === p.name) return setName(p.name);
    await api.updateProject(p.id, { name: n });
    router.refresh();
  }

  async function remove() {
    setMenu(false);
    const extra = p.openCount ? ` It has ${p.openCount} open issue${p.openCount === 1 ? "" : "s"}.` : "";
    const yes = await confirmDialog({
      title: `Delete “${p.name}”?`,
      message: `All of its pages, comments and replies will be permanently deleted.${extra} This can't be undone.`,
      confirmLabel: "Delete project",
    });
    if (!yes) return;
    await api.deleteProject(p.id);
    if (path.startsWith(`/app/projects/${p.id}`)) router.push("/app/projects");
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={rename} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => rename()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setName(p.name);
              setEditing(false);
            }
          }}
          className="h-7 min-w-0 flex-1 rounded border border-blue bg-paper px-1.5 text-[13.5px] outline-none"
          aria-label="Project name"
        />
      </form>
    );
  }

  return (
    <div ref={ref} className="group relative">
      <Link
        href={`/app/projects/${p.id}`}
        className={cn("flex items-center gap-2.5 rounded-lg py-1.5 pl-2.5 pr-8 text-[13.5px]", active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/60")}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
        <span className="min-w-0 flex-1 truncate">{p.name}</span>
        {!!p.openCount && <span className="font-mono text-[11px] text-ink-3 group-hover:opacity-0">{p.openCount}</span>}
      </Link>
      <button
        onClick={() => setMenu((m) => !m)}
        title="Project options"
        aria-label={`Options for ${p.name}`}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-surface hover:text-ink",
          menu ? "opacity-100" : "opacity-0 focus:opacity-100 group-hover:opacity-100",
        )}
      >
        <MoreHorizontal size={15} />
      </button>
      {menu && (
        <div className="animate-pop absolute right-1 top-9 z-30 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2">
          <MenuLink href={`/app/projects/${p.id}/review`} icon={<Crosshair size={14} />} onClick={() => setMenu(false)}>
            Open review canvas
          </MenuLink>
          <button onClick={() => { setMenu(false); setEditing(true); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface-2">
            <Pencil size={14} /> Rename
          </button>
          <MenuLink href={`/app/projects/${p.id}?tab=settings`} icon={<Settings size={14} />} onClick={() => setMenu(false)}>
            Project settings
          </MenuLink>
          <div className="my-1 border-t border-line" />
          <button onClick={remove} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-danger hover:bg-danger-soft">
            <Trash2 size={14} /> Delete project
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-surface-2">
      {icon}
      {children}
    </Link>
  );
}
