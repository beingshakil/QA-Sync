import { fail, member, ok, readJson } from "@/server/http";
import { addAdmin, isAdmin, isMainAdmin, listAdmins, removeAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** GET /api/admin/admins: every site admin (any admin can see the list). */
export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await isAdmin(ctx.email))) return fail("Not found", 404);
  return ok(await listAdmins());
}

/** POST /api/admin/admins { email }: make someone an admin. Main admins (QASYNC_ADMIN_EMAILS) only. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await isAdmin(ctx.email))) return fail("Not found", 404);
  if (!isMainAdmin(ctx.email)) return fail("Only a main admin can add admins", 403);
  const email = (await readJson<{ email?: string }>(req))?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL.test(email)) return fail("Enter a valid email address");
  if (isMainAdmin(email)) return fail("That address is already a main admin", 409);
  await addAdmin(email, ctx.email);
  return ok(await listAdmins(), 201);
}

/** DELETE /api/admin/admins { email }: remove an admin. Main admins only; main admins themselves can't be removed here. */
export async function DELETE(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await isAdmin(ctx.email))) return fail("Not found", 404);
  if (!isMainAdmin(ctx.email)) return fail("Only a main admin can remove admins", 403);
  const email = (await readJson<{ email?: string }>(req))?.email?.trim().toLowerCase() ?? "";
  if (isMainAdmin(email)) return fail("Main admins are set in QASYNC_ADMIN_EMAILS and can't be removed here", 409);
  await removeAdmin(email);
  return ok(await listAdmins());
}
