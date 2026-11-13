import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui";
import { adminStats, adminUsers, isAdmin } from "@/server/admin";
import { requireCtx } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }) + " UTC" : "—";

/** Everyone who has signed up, for the site owner (QASYNC_ADMIN_EMAILS). Everyone else gets a 404. */
export default async function AdminPage() {
  const ctx = await requireCtx();
  if (!isAdmin(ctx.email)) notFound();
  const [stats, users] = await Promise.all([adminStats(), adminUsers()]);
  const tiles: [string, number | undefined, string?][] = [
    ["Users", stats.users],
    ["New this week", stats.new7],
    ["Signed in this week", stats.active7],
    ["Workspaces", stats.workspaces],
    ["Projects", stats.projects],
    ["Issues", stats.issues],
    ["Audits", stats.audits],
    ["Pending invites", stats.invites],
  ];

  return (
    <>
      <PageHeader title="Admin" sub="Everyone who has signed in with Google. Visible only to the site admins." />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <div className="text-[12.5px] text-ink-3">{label}</div>
              <div className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight">{value ?? 0}</div>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Users</h2>
            <span className="text-[12.5px] text-ink-3">Newest first · times in UTC</span>
          </div>
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-ink-3">Nobody has signed up yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-3">
                    <th className="px-5 py-2.5 font-medium">User</th>
                    <th className="px-3 py-2.5 font-medium">Joined</th>
                    <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                    <th className="px-3 py-2.5 text-right font-medium">Sign-ins</th>
                    <th className="px-3 py-2.5 font-medium">Workspaces</th>
                    <th className="px-3 py-2.5 text-right font-medium">Projects</th>
                    <th className="px-5 py-2.5 text-right font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} image={u.image} size={30} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">{u.name}</div>
                            <a href={`mailto:${u.email}`} className="truncate text-[12.5px] text-ink-3 hover:text-brand-ink">
                              {u.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-2">{fmt(u.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-2">{fmt(u.lastLoginAt)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">{u.loginCount}</td>
                      <td className="max-w-[260px] px-3 py-3 text-ink-2">
                        <span className="line-clamp-2">{u.workspaces || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">{u.projects}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-ink-2">{u.issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
