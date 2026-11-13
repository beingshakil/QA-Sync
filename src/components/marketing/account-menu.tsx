"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FolderKanban, LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type Me = { name: string; email: string; image: string | null };

/**
 * Who's signed in, read on the client so marketing pages stay static.
 * undefined while loading, null when signed out.
 */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: { name?: string | null; email?: string | null; image?: string | null } } | null) => {
        if (!alive) return;
        const u = s?.user;
        setMe(u?.email ? { name: u.name?.trim() || u.email.split("@")[0], email: u.email, image: u.image ?? null } : null);
      })
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);
  return me;
}

/** Header account button: avatar and name, with a small menu (open app, settings, sign out). */
export function AccountMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-ink-2 transition hover:bg-surface-2 hover:text-ink";
  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border border-line-strong py-1 pl-1 pr-3 text-sm font-medium text-ink transition hover:border-ink-3 hover:bg-surface-2",
          open && "border-ink-3 bg-surface-2",
        )}
      >
        <Avatar name={me.name} image={me.image} size={28} />
        <span className="max-w-[140px] truncate">{me.name}</span>
        <ChevronDown size={14} className={cn("text-ink-3 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2 backdrop-blur-md">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={me.name} image={me.image} size={36} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-ink">{me.name}</div>
              <div className="truncate text-[12.5px] text-ink-3">{me.email}</div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/app/projects" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <FolderKanban size={15} /> Open QASync
          </Link>
          <Link href="/app/settings" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <Settings size={15} /> Settings
          </Link>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={item}>
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
