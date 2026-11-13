"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Loader2, Plus, ExternalLink, AlertTriangle, AlertCircle, Info, MessageSquarePlus } from "lucide-react";
import { api } from "@/lib/api";
import type { Audit, AuditFinding, Project } from "@/lib/types";
import { Button, Ago } from "@/components/ui";
import { useConfirm } from "@/components/confirm";

import { cn } from "@/lib/utils";

/* ── New project ── */
export function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [figma, setFigma] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={15} /> New project
      </Button>
    );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const p = await api.createProject({ name, url, figmaUrl: figma });
      router.push(`/app/projects/${p.id}/review${p.openPage ? `?page=${encodeURIComponent(p.openPage)}` : ""}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2">
        <h2 className="text-lg font-semibold">New project</h2>
        <p className="mt-1 text-sm text-ink-3">Paste the site you want reviewed. You can add pages later.</p>
        <div className="mt-5 space-y-3">
          <Field label="Website URL" required>
            <input autoFocus required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://staging.yoursite.com" className="input" />
          </Field>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Defaults to the domain" className="input" />
          </Field>
          <Field label="Figma file (optional)">
            <input value={figma} onChange={(e) => setFigma(e.target.value)} placeholder="https://figma.com/design/…" className="input" />
          </Field>
        </div>
        {err && <p className="mt-3 text-sm text-accent-ink">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />} Create & open canvas</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="text-accent-ink"> *</span>}
      </span>
      {children}
    </label>
  );
}

/* ── Share link ── */
export function ShareBox({ projectId }: { projectId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function make() {
    const s = await api.share(projectId);
    const url = `${window.location.origin}${s.path}`;
    setLink(url);
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-1">
      <div className="font-medium">Guest link</div>
      <p className="mt-1 text-[13px] text-ink-3">Anyone with the link can pin feedback and reply. No account needed.</p>
      {link ? (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={link} className="input font-mono text-[12px]" onFocus={(e) => e.target.select()} />
          <Button size="sm" variant="secondary" onClick={make} title="Copy">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
          <a href={link} target="_blank" rel="noreferrer" className="rounded-md p-2 text-ink-3 hover:text-ink" title="Open">
            <ExternalLink size={14} />
          </a>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-3" onClick={make}>
          <Copy size={14} /> Copy guest link
        </Button>
      )}
    </div>
  );
}

/* ── Project settings ── */
export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.baseUrl);
  const [figma, setFigma] = useState(project.figmaUrl ?? "");
  const [saved, setSaved] = useState(false);
  const confirmDialog = useConfirm();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.updateProject(project.id, { name, baseUrl: url, figmaUrl: figma || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    router.refresh();
  }
  async function remove() {
    const yes = await confirmDialog({
      title: `Delete “${project.name}”?`,
      message: "All of its pages, comments, replies, share links, audits and design images will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete project",
    });
    if (!yes) return;
    await api.deleteProject(project.id);
    router.push("/app/projects");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-8">
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-1">
        <Field label="Project name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Base URL">
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="input font-mono text-[13px]" />
        </Field>
        <Field label="Figma file">
          <input value={figma} onChange={(e) => setFigma(e.target.value)} placeholder="Link a Figma file for design overlay (Phase 2)" className="input" />
        </Field>
        <Button>{saved ? <><Check size={14} /> Saved</> : "Save changes"}</Button>
      </form>
      <div className="rounded-2xl border border-danger/30 bg-danger-soft/60 p-6">
        <div className="font-medium text-danger">Delete project</div>
        <p className="mt-1 text-sm text-ink-2">Removes the project, its issues, comments, share links and audits.</p>
        <Button variant="danger" className="mt-4" onClick={remove}>
          Delete project
        </Button>
      </div>
    </div>
  );
}

/* ── Audits ── */
export function AuditPanel({ project, initial }: { project: Project; initial: Audit[] }) {
  const router = useRouter();
  const [audits, setAudits] = useState(initial);
  const [url, setUrl] = useState(project.baseUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const a = await api.runAudit(project.id, url);
      setAudits((xs) => [a, ...xs]);
      setOpenId(a.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toIssue(a: Audit, f: AuditFinding) {
    await api.createIssue({
      projectId: project.id,
      pageUrl: a.url,
      title: f.message,
      body: [f.message, f.detail].filter(Boolean).join("\n"),
      priority: f.severity === "error" ? "high" : f.severity === "warning" ? "medium" : "low",
      selector: f.selector ?? null,
      xPct: 50,
      yPct: 50,
    });
    router.refresh();
    alert("Issue created. It's in the Issues tab.");
  }

  return (
    <div className="space-y-5">
      <form onSubmit={run} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4 shadow-1">
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="input min-w-0 flex-1 font-mono text-[13px]" aria-label="Page to audit" />
        <Button disabled={busy}>
          {busy && <Loader2 size={14} className="animate-spin" />} {busy ? "Auditing… (checks every link)" : "Run audit"}
        </Button>
        {err && <p className="w-full text-sm text-accent-ink">{err}</p>}
      </form>

      {audits.length === 0 && <p className="text-sm text-ink-3">No audits yet. Run one to get a score out of 100.</p>}
      {audits.map((a) => (
        <div key={a.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
          <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex w-full items-center gap-4 p-4 text-left">
            <ScoreRing score={a.score} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[13px]">{a.url}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-[12.5px] text-ink-3">
                <span className="text-accent-ink">{a.stats.errors} errors</span>
                <span>{a.stats.warnings} warnings</span>
                <span>{a.stats.linksChecked} links checked</span>
                <span>{a.stats.fonts} fonts</span>
                <span><Ago iso={a.createdAt} /></span>
              </div>
            </div>
            <span className="font-mono text-[11px] text-ink-3">{openId === a.id ? "hide" : "details"}</span>
          </button>
          {openId === a.id && (
            <ul className="divide-y divide-line border-t border-line">
              {a.findings.length === 0 && <li className="p-4 text-sm text-ink-3">No problems found. 🎉</li>}
              {a.findings.map((f, i) => (
                <li key={i} className="group flex items-start gap-3 px-4 py-3 text-[13.5px]">
                  {f.severity === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-accent-ink" /> : f.severity === "warning" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--st-progress)]" /> : <Info size={16} className="mt-0.5 shrink-0 text-ink-3" />}
                  <div className="min-w-0 flex-1">
                    <div>{f.message}</div>
                    {f.detail && <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-3">{f.detail}</div>}
                  </div>
                  <span className="hidden font-mono text-[10.5px] text-ink-3 sm:inline">{f.rule}</span>
                  <button onClick={() => toIssue(a, f)} className="rounded-md p-1 text-ink-3 opacity-0 hover:bg-surface-2 hover:text-ink group-hover:opacity-100" title="Create issue">
                    <MessageSquarePlus size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? "var(--st-verified)" : score >= 70 ? "var(--st-progress)" : "var(--brand)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center font-mono font-semibold", size > 60 ? "text-xl" : "text-[14px]")}>{score}</span>
    </div>
  );
}
