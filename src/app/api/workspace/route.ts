import { cookies } from "next/headers";
import { cancelInvite, checkLimit, getWorkspace, inviteMember, removeMember, renameUser, renameWorkspace } from "@/server/repo";
import { fail, member, ok, readJson } from "@/server/http";
import { WS_COOKIE } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  return ok(await getWorkspace(ctx.workspaceId, ctx.userId));
}

/**
 * PATCH /api/workspace
 *   { userName }             your display name (anyone)
 *   { name }                 workspace name (owner/admin)
 *   { invite: email }        invite someone by Google email (owner/admin)
 *   { cancelInvite: email }  withdraw an invite (owner/admin)
 *   { removeMember: userId } remove a member (owner/admin; the owner can't be removed)
 *   { switchTo: workspaceId } make another of your workspaces active
 */
export async function PATCH(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ name?: string; userName?: string; invite?: string; cancelInvite?: string; removeMember?: string; switchTo?: string }>(req);
  if (!b) return fail("Invalid body");
  const admin = ctx.role === "owner" || ctx.role === "admin";

  if (b.switchTo) {
    if (!ctx.workspaces.some((w) => w.id === b.switchTo)) return fail("Not a member of that workspace", 403);
    (await cookies()).set(WS_COOKIE, b.switchTo, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return ok({ ok: true });
  }
  if (b.userName !== undefined) {
    if (!b.userName.trim()) return fail("Your name can't be empty");
    await renameUser(ctx.userId, ctx.workspaceId, b.userName);
  }
  if (b.name !== undefined || b.invite || b.cancelInvite || b.removeMember) {
    if (!admin) return fail("Only the workspace owner can change this", 403);
  }
  if (b.name !== undefined && b.name.trim()) await renameWorkspace(ctx.workspaceId, b.name);
  if (b.invite) {
    const email = b.invite.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address");
    const limited = await checkLimit(ctx.workspaceId, "members");
    if (limited) return fail(limited, 402);
    const r = await inviteMember(ctx.workspaceId, email, ctx.userId);
    if (!r.ok) return fail(r.reason, 409);
  }
  if (b.cancelInvite) await cancelInvite(ctx.workspaceId, b.cancelInvite);
  if (b.removeMember) {
    if (b.removeMember === ctx.userId) return fail("You can't remove yourself");
    await removeMember(ctx.workspaceId, b.removeMember);
  }
  return ok(await getWorkspace(ctx.workspaceId, ctx.userId));
}
