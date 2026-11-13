import { addComment, checkLimit, notifyUsage, requireFeature } from "@/server/repo";
import { actorFrom, fail, issueFor, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ body?: string; shareToken?: string; guestName?: string }>(req);
  if (!b?.body?.trim()) return fail("Comment can't be empty");
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const issue = await issueFor(actor, id);
  if (!issue) return fail("Not found", 404);
  if (actor.kind === "guest" && (await requireFeature(issue.workspaceId, "guests"))) return fail("This review is view-only for now. Commenting is turned off for guests.", 402);
  const limited = await checkLimit(issue.workspaceId, "comments");
  if (limited) return fail(actor.kind === "guest" ? "This project can't take new replies right now. Let the team know." : limited, 402);
  const comment = await addComment({ issueId: id, author: actor.name, authorType: actor.kind, body: b.body.trim().slice(0, 5000) });
  await notifyUsage(issue.workspaceId);
  return ok(comment, 201);
}
