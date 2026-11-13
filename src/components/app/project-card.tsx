"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Clock, ExternalLink, FolderOpen, Globe, Link2, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/confirm";
import { buttonClass } from "@/components/ui";
import { cn, hostOf } from "@/lib/utils";

export interface ProjectCardData {
  id: string;
  name: string;
  baseUrl: string;
  color: string;
  createdAt: string;
  issueCount?: number;
  openCount?: number;
}

const THUMB_W = 1440;
const THUMB_H = 900;

/** Project card: live preview, name, URL, comment count and date, then Open / copy link / details / delete. */
export function ProjectCard({ project }: { project: ProjectCardData }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayUrl = project.baseUrl.startsWith("/") ? `localhost${project.baseUrl}` : hostOf(project.baseUrl).replace(/^www\./, "www.");
  const reviewHref = `/app/projects/${project.id}/review`;
  const comments = project.issueCount ?? 0;
  const created = new Date(project.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

  async function copyLink() {
    setCopying(true);
    try {
      const s = await api.share(project.id);
      const url = `${window.location.origin}${s.path}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        window.prompt("Copy this share link", url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } finally {
      setCopying(false);
    }
  }

  async function remove() {
    const yes = await confirmDialog({
      title: `Delete “${project.name}”?`,
      message: `All of its pages, ${comments} comment${comments === 1 ? "" : "s"} and replies will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete project",
    });
    if (!yes) return;
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-surface p-2 shadow-1 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-2",
        deleting && "pointer-events-none opacity-50",
      )}
      aria-label={project.name}
    >
      {/* Preview */}
      <Link href={reviewHref} className="relative block overflow-hidden rounded-xl" aria-label={`Open ${project.name} for review`}>
        <SitePreview url={project.baseUrl} />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur">
          <Globe size={13} /> Live site
        </span>
        {!!project.openCount && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            {project.openCount} open
          </span>
        )}
      </Link>

      {/* Details */}
      <div className="px-2 pb-1 pt-3.5">
        <h3 className="truncate text-[17px] font-semibold tracking-tight text-ink" title={project.name}>
          {project.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-3">
          <Globe size={14} className="shrink-0" />
          <span className="truncate" title={project.baseUrl}>{displayUrl}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare size={14} className="text-ink-3" />
            <b className="font-semibold">{comments}</b> comment{comments === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
            <Clock size={14} className="text-ink-3" />
            {created}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 px-1 pb-1">
        <Link href={reviewHref} className={cn(buttonClass("primary", "md"), "h-10 flex-1 rounded-lg")}>
          <ExternalLink size={16} /> Open Report
        </Link>
        <IconAction title={copied ? "Link copied" : "Copy share link"} onClick={copyLink} disabled={copying}>
          {copying ? <Loader2 size={16} className="animate-spin" /> : copied ? <Check size={16} className="text-[var(--st-verified)]" /> : <Link2 size={16} />}
        </IconAction>
        <IconAction title="Project details: pages, issues, settings" href={`/app/projects/${project.id}`}>
          <FolderOpen size={16} />
        </IconAction>
        <IconAction title="Delete project" onClick={remove} danger>
          <Trash2 size={16} />
        </IconAction>
      </div>
    </article>
  );
}

function IconAction({ children, title, onClick, href, danger, disabled }: { children: React.ReactNode; title: string; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean }) {
  const cls = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition",
    danger ? "border-transparent bg-danger-soft text-danger hover:brightness-110" : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink",
  );
  if (href)
    return (
      <Link href={href} title={title} aria-label={title} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} disabled={disabled} className={cn(cls, "disabled:opacity-60")}>
      {children}
    </button>
  );
}

/** Script-free, scaled-down snapshot of the site (loads lazily, never interactive). */
function SitePreview({ url }: { url: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.22);
  const [loaded, setLoaded] = useState(false);
  // Mount the iframe only after hydration: a server-rendered iframe can finish loading
  // before React attaches onLoad, which would leave the preview hidden forever.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / THUMB_W));
    ro.observe(el);
    // `load` waits for every image/video on the site; the document itself paints much sooner.
    const fallback = setTimeout(() => setLoaded(true), 1200);
    return () => {
      ro.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={boxRef} className="relative aspect-[16/10] w-full overflow-hidden bg-[#0b1024]">
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
      {mounted && <iframe
        src={`/api/proxy?url=${encodeURIComponent(url)}&thumb=1`}
        title=""
        aria-hidden
        tabIndex={-1}
        loading="lazy"
        sandbox=""
        onLoad={() => setLoaded(true)}
        className={cn("pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        style={{ width: THUMB_W, height: THUMB_H, transform: `scale(${scale})` }}
      />}
    </div>
  );
}
