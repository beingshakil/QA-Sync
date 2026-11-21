import { fail, issueFor, member, ok, projectFor, readJson } from "@/server/http";
import { getIntegration, getLink, notionConfigured, notionPageFor, notionPagesFor, pushIssue } from "@/server/notion";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/** At most this many per request: the review canvas sends a page's comments in batches, with progress. */
const BATCH = 10;

/**
 * POST { issueId }    →  { url }: send (or update) one issue in Notion.
 * POST { issueIds }   →  { results: { id: url }, errors: { id: message } }: a batch of up to 10.
 */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ issueId?: string; issueIds?: string[] }>(req);
  const actor = { kind: "member" as const, name: ctx.userName, userId: ctx.userId, workspaceId: ctx.workspaceId, role: ctx.role };

  if (Array.isArray(b?.issueIds)) {
    const ids = [...new Set(b.issueIds.filter((x): x is string => typeof x === "string"))];
    if (!ids.length) return fail("No issues to send");
    if (ids.length > BATCH) return fail(`Send at most ${BATCH} issues at a time`);
    const results: Record<string, string | null> = {};
    const errors: Record<string, string> = {};
    for (const id of ids) {
      const issue = await issueFor(actor, id);
      if (!issue) {
        errors[id] = "Issue not found";
        continue;
      }
      try {
        results[id] = await pushIssue(issue.id);
      } catch (e) {
        const message = (e as Error).message;
        // Not linked (or the connection is gone): every other issue would fail the same way.
        if (/isn't linked/.test(message)) return fail(message, 409);
        errors[id] = message;
        reportError({ kind: "integration", message: `Notion: ${message}`, url: issue.pageUrl });
      }
    }
    return ok({ results, errors });
  }

  const issue = b?.issueId ? await issueFor(actor, b.issueId) : null;
  if (!issue) return fail("Issue not found", 404);
  try {
    return ok({ url: await pushIssue(issue.id) });
  } catch (e) {
    reportError({ kind: "integration", message: `Notion: ${(e as Error).message}`, url: issue.pageUrl });
    return fail(`Couldn't send to Notion: ${(e as Error).message}`, 502);
  }
}

/**
 * GET ?issueId=…    →  { linked, url }: is the project linked, and is this issue already in Notion?
 * GET ?projectId=…  →  { configured, connected, linked, databaseUrl, pages: { issueId: url } } for the review canvas.
 */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const params = new URL(req.url).searchParams;

  const projectId = params.get("projectId");
  if (projectId) {
    const project = await projectFor(ctx, projectId);
    if (!project) return fail("Project not found", 404);
    const [integ, link] = await Promise.all([getIntegration(ctx.workspaceId), getLink(project.id)]);
    const linked = !!(integ && link);
    return ok({
      configured: await notionConfigured(),
      connected: !!integ,
      linked,
      databaseUrl: link?.databaseUrl ?? null,
      pages: linked ? await notionPagesFor(project.id) : {},
    });
  }

  const actor = { kind: "member" as const, name: ctx.userName, userId: ctx.userId, workspaceId: ctx.workspaceId, role: ctx.role };
  const id = params.get("issueId");
  const issue = id ? await issueFor(actor, id) : null;
  if (!issue) return fail("Issue not found", 404);
  return ok({ linked: !!(await getLink(issue.projectId)), url: await notionPageFor(issue.id) });
}
