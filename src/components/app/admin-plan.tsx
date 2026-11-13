"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mail, Sparkles } from "lucide-react";
import type { WorkspacePlan } from "@/lib/plans";
import { useConfirm } from "@/components/confirm";
import { cn } from "@/lib/utils";

const DURATIONS: { label: string; months: number | null }[] = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "No end date", months: null },
];

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function setPlan(body: { userId: string; plan: "pro" | "free"; months?: number | null; notify?: boolean }) {
  const res = await fetch("/api/admin/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as { email: { sent: boolean; reason?: string } | null; expiresAt: string | null };
}

/** Plan cell in the admin users table: shows the plan and lets the admin give Pro or move back to Free. */
export function AdminPlan({ userId, name, email, plan }: { userId: string; name: string; email: string; plan: WorkspacePlan | null }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<number | null>(1);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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

  if (!plan) return <span className="text-[12.5px] text-ink-3">Member only</span>;
  const pro = plan.plan === "pro";

  async function givePro() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await setPlan({ userId, plan: "pro", months, notify });
      setOpen(false);
      setMsg(
        !notify
          ? { ok: true, text: "Pro given · no email sent" }
          : r.email?.sent
            ? { ok: true, text: `Pro given · email sent to ${email}` }
            : { ok: false, text: `Pro given · ${r.email?.reason ?? "email not sent"}` },
      );
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function toFree() {
    const yes = await confirmDialog({
      title: `Move ${name} to Free?`,
      message: "Their workspace keeps all its projects and comments, but can't add more above the Free limits. No email is sent.",
      confirmLabel: "Move to Free",
    });
    if (!yes) return;
    setBusy(true);
    setMsg(null);
    try {
      await setPlan({ userId, plan: "free" });
      setMsg({ ok: true, text: "Moved to Free" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", pro ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-ink-2")}>
          {pro && <Sparkles size={11} />}
          {pro ? "Pro" : "Free"}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          className="rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink-2 transition hover:border-line-strong hover:text-ink disabled:opacity-50"
          aria-expanded={open}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : pro ? "Change" : "Give Pro"}
        </button>
      </div>
      <div className="mt-1 text-[11.5px] text-ink-3">
        {pro ? (plan.expiresAt ? `until ${fmt(plan.expiresAt)}` : "no end date") : plan.expired && plan.expiresAt ? `Pro ended ${fmt(plan.expiresAt)}` : ""}
      </div>
      {msg && <div className={cn("mt-1 max-w-[220px] text-[11.5px]", msg.ok ? "text-pass" : "text-danger")}>{msg.text}</div>}

      {open && (
        <div className="animate-pop absolute right-0 top-9 z-30 w-[280px] rounded-xl border border-line bg-surface p-4 text-left shadow-2" role="dialog" aria-label={`Plan for ${name}`}>
          <div className="text-[13.5px] font-semibold text-ink">Give {name.split(" ")[0]} Pro</div>
          <div className="mt-0.5 text-[12px] text-ink-3">Applies to the workspace they own.</div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setMonths(d.months)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[12.5px] transition",
                  months === d.months ? "border-brand bg-brand-soft font-medium text-ink" : "border-line text-ink-2 hover:border-line-strong",
                  d.months === null && "col-span-2",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-2">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 accent-[var(--brand)]" />
            <span>
              <Mail size={12} className="mr-1 inline" />
              Email {email} that they&apos;re on Pro
            </span>
          </label>
          <button
            type="button"
            onClick={givePro}
            disabled={busy}
            className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-[13px] font-medium text-paper transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {pro ? "Update Pro" : "Give Pro"}
          </button>
          {pro && (
            <button type="button" onClick={toFree} disabled={busy} className="mt-2 h-8 w-full rounded-lg text-[12.5px] text-danger hover:bg-danger-soft">
              Move back to Free
            </button>
          )}
        </div>
      )}
    </div>
  );
}
