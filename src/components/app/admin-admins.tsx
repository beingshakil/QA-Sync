"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useConfirm } from "@/components/confirm";
import type { SiteAdmin } from "@/server/admin";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function call(method: "POST" | "DELETE", email: string) {
  const res = await fetch("/api/admin/admins", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
}

/** Who can open the admin page. Main admins (QASYNC_ADMIN_EMAILS) can add and remove the others. */
export function AdminAdmins({ admins, canManage, me }: { admins: SiteAdmin[]; canManage: boolean; me: string }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setBusy("add");
    setErr(null);
    try {
      await call("POST", v);
      setEmail("");
      router.refresh();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(a: SiteAdmin) {
    const yes = await confirmDialog({
      title: `Remove ${a.name ?? a.email} as admin?`,
      message: "They'll lose access to the admin page. Their workspaces go back to the plan they had before, and nothing is deleted.",
      confirmLabel: "Remove admin",
    });
    if (!yes) return;
    setBusy(a.email);
    setErr(null);
    try {
      await call("DELETE", a.email);
      router.refresh();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-semibold">Admins</h2>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Admins can open this page and give or remove Pro, and their own workspaces are always Pro. Only main admins, set in{" "}
          <code className="font-mono text-[12px]">QASYNC_ADMIN_EMAILS</code>, can add or remove admins.
        </p>
      </div>
      <ul className="divide-y divide-line">
        {admins.map((a) => (
          <li key={a.email} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={a.name ?? a.email} image={a.image} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium text-ink">{a.name ?? a.email}</span>
                {a.email === me.toLowerCase() && <span className="text-[12px] text-ink-3">(you)</span>}
              </div>
              <div className="truncate text-[12.5px] text-ink-3">
                {a.name ? `${a.email} · ` : ""}
                {a.main ? "set in QASYNC_ADMIN_EMAILS" : a.createdAt ? `added ${fmt(a.createdAt)}${a.addedBy ? ` by ${a.addedBy}` : ""}` : ""}
                {!a.name && !a.main ? " · hasn't signed in yet" : ""}
              </div>
            </div>
            <span
              className={
                a.main
                  ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-ink"
                  : "inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink-2"
              }
            >
              {a.main ? <Crown size={12} /> : <ShieldCheck size={12} />}
              {a.main ? "Main admin" : "Admin"}
            </span>
            {canManage && !a.main && (
              <button
                onClick={() => remove(a)}
                disabled={!!busy}
                className="shrink-0 rounded-md p-1.5 text-ink-3 transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                title="Remove admin"
                aria-label={`Remove ${a.email} as admin`}
              >
                {busy === a.email ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            )}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/40 px-5 py-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
            className="input h-9 min-w-[220px] flex-1"
            aria-label="Email to make admin"
          />
          <button
            type="submit"
            disabled={!email.trim() || !!busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === "add" ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Make admin
          </button>
          {err && <p className="w-full text-[12.5px] text-danger">{err}</p>}
          <p className="w-full text-[12px] text-ink-3">Use the Google address they sign in with. It works before they&apos;ve signed up, too.</p>
        </form>
      ) : (
        err && <p className="border-t border-line px-5 py-3 text-[12.5px] text-danger">{err}</p>
      )}
    </section>
  );
}
