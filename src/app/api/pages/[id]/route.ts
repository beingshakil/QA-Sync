import { deletePage, getPage, listPages, requireFeature, setPageQa } from "@/server/repo";
import { actorFrom, fail, member, ok, projectFor, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/pages/:id { qa: "done" | "pending" }: sign a page off (members and guests) or undo it */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ qa?: "done" | "pending"; shareToken?: string; guestName?: string }>(req);
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const page = await getPage(id);
  const project = page ? await projectFor(actor, page.projectId) : null;
  if (!page || !project) return fail("Not found", 404);
  const off = await requireFeature(project.workspaceId!, "pageQa");
  if (off) return fail(off, 402);
  if (b?.qa !== "done" && b?.qa !== "pending") return fail("qa must be done or pending");
  await setPageQa(id, b.qa === "done", actor.name);
  return ok(await listPages(page.projectId));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const id = (await params).id;
  const page = await getPage(id);
  if (!page || !(await projectFor(ctx, page.projectId))) return fail("Not found", 404);
  const r = await deletePage(id);
  if (!r.ok) return fail(r.reason ?? "Can't remove this page", 409);
  return ok(await listPages(page.projectId));
}
