"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Crown, Loader2, Mail, Search, ShieldCheck, ShieldOff, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useConfirm } from "@/components/confirm";
import type { AdminUser } from "@/server/admin";
import { cn } from "@/lib/utils";

type Filter = "all" | "pro" | "free" | "admins";

const DURATIONS: { label: string; months: number | null }[] = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "No end date", months: null },
];

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
function ago(iso: string | null) {
  if (!iso) return "Never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return date(iso);
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
const isPro = (u: AdminUser) => u.plan?.plan === "pro";

/** Searchable, filterable list of everyone who signed up; each row opens a "Manage" popup. */
export function AdminUsers({ users, canManageAdmins, mailReady, me }: { users: AdminUser[]; canManageAdmins: boolean; mailReady: boolean; me: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({ all: users.length, pro: users.filter(isPro).length, free: users.filter((u) => !isPro(u)).length, admins: users.filter((u) => u.adminRole).length }),
    [users],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "pro" && !isPro(u)) return false;
      if (filter === "free" && isPro(u)) return false;
      if (filter === "admins" && !u.adminRole) return false;
      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.workspaces.toLowerCase().includes(q);
    });
  }, [users, query, filter]);
  const open = users.find((u) => u.id === openId) ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="mr-auto">
          <h2 className="font-semibold">Users</h2>
          <p className="text-[12.5px] text-ink-3">Click anyone to give Pro, change their plan or make them an admin.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
          {(["all", "pro", "free", "admins"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium capitalize transition",
                filter === f ? "bg-surface-2 text-ink shadow-1" : "text-ink-3 hover:text-ink",
              )}
            >
              {f}
              <span className="tabular-nums text-[11.5px] text-ink-3">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-paper px-3 sm:w-64">
          <Search size={14} className="text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
        </label>
      </div>

      <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-line px-5 py-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-3 md:grid">
        <span>User</span>
        <span>Plan</span>
        <span>Last active</span>
        <span>Usage</span>
        <span className="w-[84px]" />
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-[14px] text-ink-3">{users.length ? "Nobody matches that search." : "Nobody has signed up yet."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => setOpenId(u.id)}
                className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 text-left transition hover:bg-surface-2/60 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={u.name} image={u.image} size={36} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-medium text-ink">{u.name}</span>
                      {u.adminRole && <RoleBadge role={u.adminRole} />}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-3">{u.email}</span>
                  </span>
                </span>
                <span className="hidden md:block">
                  <PlanBadge u={u} />
                </span>
                <span className="hidden text-[13px] text-ink-2 md:block">{ago(u.lastLoginAt)}</span>
                <span className="hidden text-[13px] text-ink-2 md:block">
                  {u.projects} project{u.projects === 1 ? "" : "s"} · {u.issues} issue{u.issues === 1 ? "" : "s"}
                </span>
                <span className="flex w-[84px] items-center justify-end gap-1 text-[12.5px] font-medium text-ink-3 group-hover:text-ink">
                  <span className="md:hidden">
                    <PlanBadge u={u} compact />
                  </span>
                  <span className="hidden md:inline">Manage</span>
                  <ChevronRight size={15} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <ManageUser user={open} canManageAdmins={canManageAdmins} mailReady={mailReady} me={me} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function RoleBadge({ role }: { role: "main" | "admin" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">
      {role === "main" ? <Crown size={10} /> : <ShieldCheck size={10} />}
      {role === "main" ? "Main admin" : "Admin"}
    </span>
  );
}

function PlanBadge({ u, compact }: { u: AdminUser; compact?: boolean }) {
  const p = u.plan;
  const pro = p?.plan === "pro";
  return (
    <span className="inline-flex flex-col">
      <span
        className={cn(
          "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
          pro ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-ink-2",
        )}
      >
        {pro && <Sparkles size={11} />}
        {pro ? "Pro" : "Free"}
      </span>
      {!compact && (
        <span className="mt-0.5 text-[11.5px] text-ink-3">
          {!p ? "No own workspace" : p.admin ? "Always (admin)" : pro ? (p.expiresAt ? `until ${date(p.expiresAt)}` : "No end date") : p.expired && p.expiresAt ? `Pro ended ${date(p.expiresAt)}` : ""}
        </span>
      )}
    </span>
  );
}

async function post(url: string, method: "POST" | "DELETE", body: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

/** The popup: who they are, their plan (give Pro / move to Free, with an optional email) and admin access. */
function ManageUser({ user: u, canManageAdmins, mailReady, me, onClose }: { user: AdminUser; canManageAdmins: boolean; mailReady: boolean; me: string; onClose: () => void }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const pro = isPro(u);
  const [months, setMonths] = useState<number | null>(pro && u.plan?.expiresAt === null ? null : 1);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const givePro = () =>
    run("pro", async () => {
      const r = await post("/api/admin/plan", "POST", { userId: u.id, plan: "pro", months, notify });
      const until = r.expiresAt ? `until ${date(r.expiresAt)}` : "with no end date";
      const done = `Pro is active ${until}.`;
      if (!notify) return `${done} No email sent.`;
      return r.email?.sent ? `${done} Email sent to ${u.email}.` : `${done} ${r.email?.reason ?? "The email wasn't sent."}`;
    });

  const toFree = async () => {
    const yes = await confirmDialog({
      title: `Move ${u.name} to Free?`,
      message: "Their workspace keeps everything it has, but Free limits and locked tools apply again. No email is sent.",
      confirmLabel: "Move to Free",
    });
    if (yes) run("free", async () => (await post("/api/admin/plan", "POST", { userId: u.id, plan: "free" }), "Moved to Free."));
  };

  const toggleAdmin = async () => {
    if (u.adminRole === "admin") {
      const yes = await confirmDialog({ title: `Remove ${u.name} as admin?`, message: "They'll lose access to the admin page.", confirmLabel: "Remove admin" });
      if (yes) run("admin", async () => (await post("/api/admin/admins", "DELETE", { email: u.email }), "Admin access removed."));
    } else {
      run("admin", async () => (await post("/api/admin/admins", "POST", { email: u.email }), `${u.name} is now an admin.`));
    }
  };

  const info: [string, string][] = [
    ["Joined", shortDate(u.createdAt)],
    ["Last sign-in", ago(u.lastLoginAt)],
    ["Sign-ins", String(u.loginCount)],
    ["Projects", String(u.projects)],
    ["Issues", String(u.issues)],
  ];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/55 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Manage ${u.name}`} className="animate-pop w-full max-w-xl rounded-2xl border border-line bg-surface shadow-2" onMouseDown={(e) => e.stopPropagation()}>
        {/* who */}
        <div className="flex items-start gap-4 border-b border-line p-5">
          <Avatar name={u.name} image={u.image} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[17px] font-semibold text-ink">{u.name}</h3>
              {u.adminRole && <RoleBadge role={u.adminRole} />}
              {u.email.toLowerCase() === me.toLowerCase() && <span className="text-[12px] text-ink-3">(you)</span>}
            </div>
            <a href={`mailto:${u.email}`} className="truncate text-[13px] text-ink-3 hover:text-brand-ink">
              {u.email}
            </a>
            {u.workspaces && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-3">{u.workspaces}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-5 divide-x divide-line border-b border-line">
          {info.map(([k, v]) => (
            <div key={k} className="px-3 py-3 text-center">
              <div className="text-[11px] text-ink-3">{k}</div>
              <div className="mt-0.5 truncate text-[13.5px] font-semibold tabular-nums text-ink">{v}</div>
            </div>
          ))}
        </div>

        {/* plan */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-ink">Plan</div>
            <PlanBadge u={u} />
          </div>

          {u.plan?.admin ? (
            <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-ink-2">Admins always have Pro on their own workspaces, so there&apos;s nothing to change here.</p>
          ) : (
            <>
              {!u.plan && <p className="mt-2 text-[12.5px] text-ink-3">They only belong to someone else&apos;s workspace. Giving Pro creates their own workspace, on Pro.</p>}
              <div className="mt-4 text-[12px] font-medium text-ink-3">{pro ? "Change how long Pro lasts (from today)" : "Give Pro for"}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setMonths(d.months)}
                    aria-pressed={months === d.months}
                    className={cn(
                      "h-10 whitespace-nowrap rounded-xl border px-2 text-[12.5px] font-medium transition",
                      months === d.months ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
                      d.months === null && "col-span-2 sm:col-span-1",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <label className={cn("mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-4 py-3", !mailReady && "opacity-80")}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Mail size={15} className="shrink-0 text-ink-3" />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink">Email them that they&apos;re on Pro</span>
                    <span className="block truncate text-[12px] text-ink-3">{mailReady ? `A short note to ${u.email}` : "Email isn't set up yet (SMTP_USER and SMTP_PASS), so nothing will be sent"}</span>
                  </span>
                </span>
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 shrink-0 accent-[var(--brand)]" />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={givePro}
                  disabled={!!busy}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy === "pro" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {pro ? "Update Pro" : "Give Pro"}
                </button>
                {pro && (
                  <button
                    onClick={toFree}
                    disabled={!!busy}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-4 text-[13px] font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
                  >
                    {busy === "free" ? <Loader2 size={15} className="animate-spin" /> : "Move to Free"}
                  </button>
                )}
              </div>
            </>
          )}

          {msg && (
            <p className={cn("mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px]", msg.ok ? "bg-pass-soft text-pass" : "bg-danger-soft text-danger")}>
              {msg.ok && <Check size={14} className="mt-px shrink-0" />}
              {msg.text}
            </p>
          )}
        </div>

        {/* admin access (main admins only) */}
        {canManageAdmins && u.adminRole !== "main" && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink">Admin access</div>
              <div className="text-[12px] text-ink-3">{u.adminRole === "admin" ? "Can open this page and give or remove Pro." : "Let them open this page and give or remove Pro."}</div>
            </div>
            <button
              onClick={toggleAdmin}
              disabled={!!busy}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition disabled:opacity-60",
                u.adminRole === "admin" ? "border-line text-danger hover:bg-danger-soft" : "border-line text-ink hover:bg-surface-2",
              )}
            >
              {busy === "admin" ? <Loader2 size={14} className="animate-spin" /> : u.adminRole === "admin" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
              {u.adminRole === "admin" ? "Remove admin" : "Make admin"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
