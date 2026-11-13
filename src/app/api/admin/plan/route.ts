import { createWorkspace, getUser, setPlanForOwner } from "@/server/repo";
import { fail, member, ok, readJson } from "@/server/http";
import { isAdmin } from "@/server/admin";
import { proUpgradeEmail, sendMail } from "@/server/mail";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/plan { userId, plan: "pro" | "free", months?: number | null, notify?: boolean }
 * Site admins only. Sets the plan on every workspace the user owns (creating one if they own none);
 * months = null means no end date.
 * With notify (default true) an upgrade to Pro emails the user.
 */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await isAdmin(ctx.email))) return fail("Not found", 404);

  const b = await readJson<{ userId?: string; plan?: string; months?: number | null; notify?: boolean }>(req);
  if (!b?.userId || (b.plan !== "pro" && b.plan !== "free")) return fail("userId and plan (pro or free) are required");
  const user = await getUser(b.userId);
  if (!user) return fail("User not found", 404);

  let expiresAt: string | null = null;
  if (b.plan === "pro" && b.months != null) {
    const m = Math.round(Number(b.months));
    if (!Number.isFinite(m) || m < 1 || m > 120) return fail("months must be between 1 and 120, or null for no end date");
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + m);
    expiresAt = d.toISOString();
  }

  let workspaces = await setPlanForOwner(user.id, b.plan, expiresAt, ctx.email);
  if (!workspaces.length) {
    // Only a member of someone else's workspace: give them their own, on Pro.
    if (b.plan === "free") return fail("This user doesn't own a workspace", 409);
    await createWorkspace(user, `${user.name.split(" ")[0] || "My"}'s workspace`);
    workspaces = await setPlanForOwner(user.id, b.plan, expiresAt, ctx.email);
  }

  let email: { sent: boolean; reason?: string } | null = null;
  if (b.plan === "pro" && b.notify !== false) {
    email = await sendMail({ to: user.email, ...proUpgradeEmail({ name: user.name, workspaces: workspaces.map((w) => w.name), until: expiresAt }) });
  }
  return ok({ ok: true, plan: b.plan, expiresAt, workspaces, email });
}
