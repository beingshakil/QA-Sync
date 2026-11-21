import { fail, issueFor, member, ok, readJson } from "@/server/http";
import { getLink, notionPageFor, pushIssue } from "@/server/notion";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/** POST { issueId }  →  { url }: send (or update) one issue in Notion. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ issueId?: string }>(req);
  const actor = { kind: "member" as const, name: ctx.userName, userId: ctx.userId, workspaceId: ctx.workspaceId, role: ctx.role };
  const issue = b?.issueId ? await issueFor(actor, b.issueId) : null;
  if (!issue) return fail("Issue not found", 404);
  try {
    return ok({ url: await pushIssue(issue.id) });
  } catch (e) {
    reportError({ kind: "integration", message: `Notion: ${(e as Error).message}`, url: issue.pageUrl });
    return fail(`Couldn't send to Notion: ${(e as Error).message}`, 502);
  }
}

/** GET ?issueId=…  →  { linked, url }: is the project linked, and is this issue already in Notion? */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const actor = { kind: "member" as const, name: ctx.userName, userId: ctx.userId, workspaceId: ctx.workspaceId, role: ctx.role };
  const id = new URL(req.url).searchParams.get("issueId");
  const issue = id ? await issueFor(actor, id) : null;
  if (!issue) return fail("Issue not found", 404);
  return ok({ linked: !!(await getLink(issue.projectId)), url: await notionPageFor(issue.id) });
}
