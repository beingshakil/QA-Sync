import { deleteIssue, listActivity, listComments, resetPageQa, updateIssue } from "@/server/repo";
import { pushChange } from "@/server/notion";
import { actorFrom, canEditIssue, fail, isMember, issueFor, ok, readJson } from "@/server/http";
import { autoTitle, stripMentions } from "@/server/ai";
import { q } from "@/server/db";
import { OPEN_STATUSES, PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const token = new URL(req.url).searchParams.get("shareToken") ?? undefined;
  const actor = await actorFrom({ shareToken: token });
  if ("error" in actor) return fail(actor.error, actor.status);
  const issue = await issueFor(actor, id);
  if (!issue) return fail("Not found", 404);
  return ok({ issue, comments: await listComments(id), activity: await listActivity(id) });
}

interface Patch {
  status?: Status;
  priority?: Priority;
  assignee?: string | null;
  title?: string;
  body?: string;
  /** Re-derive the title from the edited body (used when editing the comment text). */
  retitle?: boolean;
  shareToken?: string;
  guestName?: string;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<Patch>(req);
  if (!b) return fail("Invalid body");
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const cur = await issueFor(actor, id);
  if (!cur) return fail("Not found", 404);

  const patch: Parameters<typeof updateIssue>[1] = {};
  if (b.status) {
    if (!STATUSES.includes(b.status)) return fail("Unknown status");
    // Guests may resolve or reopen (client sign-off), but not run the internal workflow.
    if (actor.kind === "guest" && !["fixed", "open", "verified"].includes(b.status)) return fail("Guests can only resolve or reopen", 403);
    patch.status = b.status;
  }
  if (actor.kind === "member") {
    if (b.priority && PRIORITIES.includes(b.priority)) patch.priority = b.priority;
    if (b.assignee !== undefined) patch.assignee = (await isMember(actor.workspaceId, b.assignee)) ? b.assignee : null;
  }
  // Text edits: members on any issue, guests only on their own.
  if (b.title !== undefined || b.body !== undefined) {
    if (!canEditIssue(actor, cur)) return fail("You can only edit comments you wrote", 403);
    if (b.body !== undefined) {
      const body = b.body.trim().slice(0, 5000);
      if (!body && !cur.attachments.length) return fail("The comment can't be empty");
      patch.body = body;
      if (b.retitle && !b.title) {
        const names = (await q<{ name: string }>("SELECT u.name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ?", cur.workspaceId)).map((r) => r.name);
        patch.title = autoTitle(stripMentions(body, names), cur.element).slice(0, 140);
      }
    }
    if (b.title?.trim()) patch.title = b.title.trim().slice(0, 140);
  }
  const issue = await updateIssue(id, patch, actor.name);
  if (issue && patch.status && OPEN_STATUSES.includes(patch.status)) await resetPageQa(issue.projectId, issue.pageUrl);
  if (issue) pushChange(issue.id); // keep its Notion row current, if it has one
  return issue ? ok(issue) : fail("Not found", 404);
}

/** DELETE /api/issues/:id  (body: { shareToken?, guestName? }): members delete any, guests only their own */
export async function DELETE(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const b = await readJson<{ shareToken?: string; guestName?: string }>(req);
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const issue = await issueFor(actor, id);
  if (!issue) return fail("Not found", 404);
  if (!canEditIssue(actor, issue)) return fail("You can only delete comments you wrote", 403);
  await deleteIssue(id);
  return ok({ ok: true });
}
