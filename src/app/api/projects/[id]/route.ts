import { deleteProject, getProject, updateProject } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const p = getProject((await params).id);
  return p ? ok(p) : fail("Not found", 404);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const body = await readJson<{ name?: string; baseUrl?: string; figmaUrl?: string | null }>(req);
  const p = updateProject((await params).id, body ?? {});
  return p ? ok(p) : fail("Not found", 404);
}

export async function DELETE(_: Request, { params }: Ctx) {
  deleteProject((await params).id);
  return ok({ ok: true });
}
