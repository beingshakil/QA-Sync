import { deleteComment, getComment, updateComment } from "@/server/repo";
import { actorFrom, canChangeComment, fail, guestCanTouchIssue, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/comments/:id { body, shareToken?, guestName? }: edit a reply (author only) */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ body?: string; shareToken?: string; guestName?: string }>(req);
  const actor = actorFrom(b);
  if ("error" in actor) return fail(actor.error, 403);
  const c = getComment(id);
  if (!c || !guestCanTouchIssue(actor, c.issueId)) return fail("Not found", 404);
  if (!canChangeComment(actor, c, "edit")) return fail("You can only edit your own replies", 403);
  const body = b?.body?.trim().slice(0, 5000);
  if (!body) return fail("A reply can't be empty");
  return ok(updateComment(id, body));
}

/** DELETE /api/comments/:id: members delete any reply, guests only their own */
export async function DELETE(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ shareToken?: string; guestName?: string }>(req);
  const actor = actorFrom(b);
  if ("error" in actor) return fail(actor.error, 403);
  const c = getComment(id);
  if (!c || !guestCanTouchIssue(actor, c.issueId)) return fail("Not found", 404);
  if (!canChangeComment(actor, c, "delete")) return fail("You can only delete your own replies", 403);
  deleteComment(id);
  return ok({ ok: true });
}
