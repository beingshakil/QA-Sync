import { addComment } from "@/server/repo";
import { actorFrom, fail, issueFor, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ body?: string; shareToken?: string; guestName?: string }>(req);
  if (!b?.body?.trim()) return fail("Comment can't be empty");
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  if (!(await issueFor(actor, id))) return fail("Not found", 404);
  return ok(await addComment({ issueId: id, author: actor.name, authorType: actor.kind, body: b.body.trim().slice(0, 5000) }), 201);
}
