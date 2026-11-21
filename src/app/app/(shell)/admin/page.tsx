import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, Building2, FolderKanban, Gauge, MessageSquare, Sparkles, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { AdminUsers } from "@/components/app/admin-users";
import { AdminAdmins } from "@/components/app/admin-admins";
import { AdminErrors } from "@/components/app/admin-errors";
import { listErrors } from "@/server/monitor";
import { mailConfigured } from "@/server/mail";
import { adminStats, adminUsers, isAdmin, isMainAdmin, listAdmins } from "@/server/admin";
import { requireCtx } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

/** Everyone who has signed up, plans and admins. Site admins only; everyone else gets a 404. */
export default async function AdminPage() {
  const ctx = await requireCtx();
  if (!(await isAdmin(ctx.email))) notFound();
  const [stats, users, admins, errors] = await Promise.all([adminStats(), adminUsers(), listAdmins(), listErrors()]);
  const mailReady = mailConfigured();
  const proUsers = users.filter((u) => u.plan?.plan === "pro").length;

  const primary = [
    { label: "Users", value: stats.users, icon: Users, tone: "text-blue bg-blue-soft" },
    { label: "On Pro", value: proUsers, icon: Sparkles, tone: "text-brand-ink bg-brand-soft" },
    { label: "New this week", value: stats.new7, icon: UserPlus, tone: "text-pass bg-pass-soft" },
    { label: "Active this week", value: stats.active7, icon: Activity, tone: "text-[var(--st-progress)] bg-[color-mix(in_srgb,var(--st-progress)_14%,transparent)]" },
  ];
  const secondary = [
    { label: "Workspaces", value: stats.workspaces, icon: Building2 },
    { label: "Projects", value: stats.projects, icon: FolderKanban },
    { label: "Issues", value: stats.issues, icon: MessageSquare },
    { label: "Audits", value: stats.audits, icon: Gauge },
  ];

  return (
    <>
      <PageHeader title="Admin" sub="Your users, their plans, who else can manage them, and errors across the site. Only admins can see this page." />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {!mailReady && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--st-progress)]/35 bg-[color-mix(in_srgb,var(--st-progress)_9%,transparent)] px-4 py-3 text-[13px] text-ink-2">
            <AlertTriangle size={16} className="mt-px shrink-0 text-[var(--st-progress)]" />
            <p>
              Email isn&apos;t set up yet, so Pro and limit emails won&apos;t be sent. Add <code className="font-mono text-[12px]">SMTP_USER</code> and{" "}
              <code className="font-mono text-[12px]">SMTP_PASS</code> in Vercel, then redeploy.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {primary.map((t) => (
            <div key={t.label} className="rounded-2xl border border-line bg-surface p-5 shadow-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-3">{t.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.tone}`}>
                  <t.icon size={16} />
                </span>
              </div>
              <div className="mt-3 text-[30px] font-semibold leading-none tabular-nums tracking-tight">{t.value ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {secondary.map((t) => (
            <div key={t.label} className="flex items-center gap-3 bg-surface px-5 py-3.5">
              <t.icon size={15} className="text-ink-3" />
              <span className="text-[13px] text-ink-3">{t.label}</span>
              <span className="ml-auto text-[15px] font-semibold tabular-nums">{t.value ?? 0}</span>
            </div>
          ))}
        </div>

        <AdminErrors initial={errors} />

        <AdminUsers users={users} canManageAdmins={isMainAdmin(ctx.email)} mailReady={mailReady} me={ctx.email} />
        <AdminAdmins admins={admins} canManage={isMainAdmin(ctx.email)} me={ctx.email} />
      </div>
    </>
  );
}
