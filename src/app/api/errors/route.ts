import { fail, member, ok, readJson } from "@/server/http";
import { isAdmin } from "@/server/admin";
import { clearErrors, reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/** POST /api/errors  { kind: "client" | "preview", message, url?, detail? }  report a browser-side problem
 *  DELETE /api/errors?key=…                                                    clear one group (or all) — site admins only */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ kind?: string; message?: string; url?: string; detail?: string }>(req);
  if (!b?.message || (b.kind !== "client" && b.kind !== "preview")) return fail("Bad report");
  reportError({ kind: b.kind, message: String(b.message), url: b.url ? String(b.url) : null, detail: b.detail ? String(b.detail) : null });
  return ok({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await isAdmin(ctx.email))) return fail("Not found", 404);
  await clearErrors(new URL(req.url).searchParams.get("key") ?? undefined);
  return ok({ ok: true });
}
