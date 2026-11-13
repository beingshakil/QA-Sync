import { deleteProject, updateProject } from "@/server/repo";
import { fail, member, ok, projectFor, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const p = await projectFor(ctx, (await params).id);
  return p ? ok(p) : fail("Not found", 404);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const p = await projectFor(ctx, (await params).id);
  if (!p) return fail("Not found", 404);
  const body = await readJson<{ name?: string; baseUrl?: string; figmaUrl?: string | null }>(req);
  return ok(await updateProject(p.id, body ?? {}));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const p = await projectFor(ctx, (await params).id);
  if (!p) return fail("Not found", 404);
  await deleteProject(p.id);
  return ok({ ok: true });
}
