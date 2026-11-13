import { deletePage, getPage, listPages, setPageQa } from "@/server/repo";
import { actorFrom, fail, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/pages/:id { qa: "done" | "pending" }: sign a page off (members and guests) or undo it */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ qa?: "done" | "pending"; shareToken?: string; guestName?: string }>(req);
  const actor = actorFrom(b);
  if ("error" in actor) return fail(actor.error, 403);
  const page = getPage(id);
  if (!page) return fail("Not found", 404);
  if (actor.kind === "guest" && actor.projectId !== page.projectId) return fail("Not found", 404);
  if (b?.qa !== "done" && b?.qa !== "pending") return fail("qa must be done or pending");
  setPageQa(id, b.qa === "done", actor.name);
  return ok(listPages(page.projectId));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const id = (await params).id;
  const page = getPage(id);
  if (!page) return fail("Not found", 404);
  const r = deletePage(id);
  if (!r.ok) return fail(r.reason ?? "Can't remove this page", 409);
  return ok(listPages(page.projectId));
}
