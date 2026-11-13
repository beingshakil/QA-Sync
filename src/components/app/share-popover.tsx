"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, Users, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Audience = "client" | "team";
type Scope = "page" | "project";

/**
 * Share panel: shows the actual link (so it can always be copied by hand) and builds it so the
 * recipient lands on the exact page, optionally on the selected comment.
 *   Client link → /r/<token>?page=…&issue=…   (no account needed)
 *   Team link   → /app/projects/<id>/review?page=…&issue=…
 */
export function SharePopover({
  projectId,
  pageUrl,
  pageName,
  selectedIssue,
  guestToken,
  presetToken,
  onClose,
}: {
  projectId: string;
  pageUrl: string;
  pageName: string;
  selectedIssue: { id: string; number: number } | null;
  /** Set when a guest is sharing: they can only pass on the client link they already have. */
  guestToken?: string;
  /** Guest-link token fetched ahead of time so the link shows immediately. */
  presetToken?: string;
  onClose: () => void;
}) {
  const [audience, setAudience] = useState<Audience>("client");
  const [scope, setScope] = useState<Scope>("page");
  const [withIssue, setWithIssue] = useState(!!selectedIssue);
  const [token, setToken] = useState<string | null>(guestToken ?? presetToken ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Members get (or create) the project's guest link once.
  useEffect(() => {
    if (token) return;
    api
      .share(projectId)
      .then((s) => setToken(s.token))
      .catch((e) => setErr((e as Error).message));
  }, [projectId, token]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = audience === "client" ? (token ? `${window.location.origin}/r/${token}` : "") : `${window.location.origin}/app/projects/${projectId}/review`;
    if (!base) return "";
    const qs = new URLSearchParams();
    if (scope === "page") qs.set("page", pageUrl);
    if (withIssue && selectedIssue) {
      qs.set("page", pageUrl);
      qs.set("issue", selectedIssue.id);
    }
    const q = qs.toString();
    return q ? `${base}?${q}` : base;
  }, [audience, token, projectId, scope, pageUrl, withIssue, selectedIssue]);

  useEffect(() => setCopied(null), [link]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied("ok");
    } catch {
      // Clipboard API can be blocked: fall back to selecting the text and the legacy copy command.
      const el = inputRef.current;
      el?.focus();
      el?.select();
      const ok = (() => {
        try {
          return document.execCommand("copy");
        } catch {
          return false;
        }
      })();
      setCopied(ok ? "ok" : "manual");
    }
  }

  return (
    <div ref={boxRef} className="animate-pop absolute right-0 top-11 z-50 w-[380px] rounded-2xl border border-line bg-surface p-4 shadow-2" role="dialog" aria-label="Share">
      <div className="flex items-center gap-2">
        <Link2 size={15} className="text-brand" />
        <h3 className="font-semibold">Share for review</h3>
      </div>

      {!guestToken && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-line bg-paper p-1 text-[12.5px]">
          <Seg active={audience === "client"} onClick={() => setAudience("client")} icon={<UserRound size={13} />}>
            Client · no account
          </Seg>
          <Seg active={audience === "team"} onClick={() => setAudience("team")} icon={<Users size={13} />}>
            Team member
          </Seg>
        </div>
      )}

      <div className="mt-3 space-y-1.5 text-[13px]">
        <Radio checked={scope === "page"} onChange={() => setScope("page")}>
          This page <span className="font-mono text-[11.5px] text-ink-3">· {pageName}</span>
        </Radio>
        <Radio checked={scope === "project"} onChange={() => { setScope("project"); setWithIssue(false); }}>
          Whole project <span className="text-[11.5px] text-ink-3">· opens the start page</span>
        </Radio>
        {selectedIssue && (
          <label className="flex cursor-pointer items-center gap-2 pl-0.5 pt-1">
            <input
              type="checkbox"
              checked={withIssue}
              onChange={(e) => {
                setWithIssue(e.target.checked);
                if (e.target.checked) setScope("page");
              }}
              className="accent-[var(--brand)]"
            />
            Open comment #{selectedIssue.number} directly
          </label>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <input
          ref={inputRef}
          readOnly
          value={link || "Creating link…"}
          onFocus={(e) => e.target.select()}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-paper px-2.5 font-mono text-[11.5px] text-ink-2 outline-none focus:border-blue"
          aria-label="Share link"
        />
        <button
          onClick={copy}
          disabled={!link}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white transition disabled:opacity-50",
            copied === "ok" ? "bg-[var(--st-verified)]" : "bg-brand hover:brightness-95",
          )}
        >
          {!link ? <Loader2 size={14} className="animate-spin" /> : copied === "ok" ? <Check size={14} /> : <Copy size={14} />}
          {copied === "ok" ? "Copied" : "Copy"}
        </button>
        <a
          href={link || undefined}
          target="_blank"
          rel="noreferrer"
          title="Open link in a new tab"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-3 hover:text-ink"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      {copied === "manual" && <p className="mt-2 text-[12px] text-accent-ink">The link is selected. Press Ctrl+C (⌘C on Mac) to copy it.</p>}
      {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}
      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
        {audience === "client"
          ? "Anyone with this link can view the page, pin comments and reply after entering their name. No account or install needed."
          : "For people in your workspace. Opens the review canvas on the same page."}
      </p>
    </div>
  );
}

function Seg({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition", active ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}>
      {icon}
      {children}
    </button>
  );
}

function Radio({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5">
      <input type="radio" checked={checked} onChange={onChange} className="accent-[var(--brand)]" />
      <span className="min-w-0 truncate">{children}</span>
    </label>
  );
}
