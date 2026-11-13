import { getShare, listPages, upsertPage } from "@/server/repo";
import { actorFrom, fail, member, ok, projectFor, readJson } from "@/server/http";
import { normalizeUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/pages?projectId=…  (or ?shareToken=…) → pages with QA state and issue counts */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("shareToken");
  let projectId: string | null;
  if (token) {
    const share = await getShare(token);
    if (!share) return fail("Invalid share link", 403);
    projectId = share.projectId;
  } else {
    const ctx = await member();
    if (ctx instanceof Response) return ctx;
    projectId = (await projectFor(ctx, sp.get("projectId")))?.id ?? null;
  }
  if (!projectId) return fail("Project not found", 404);
  return ok(await listPages(projectId));
}

/** POST /api/pages { projectId, url, title?, visited? }: register a page (visit or manual add) */
export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string; url?: string; title?: string; visited?: boolean; shareToken?: string; guestName?: string }>(req);
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const project = await projectFor(actor, actor.kind === "guest" ? actor.projectId : b?.projectId);
  if (!project) return fail("Project not found", 404);
  let url = b?.url?.trim();
  if (!url) return fail("A page URL is required");
  // Accept "/pricing", "pricing", or a full URL on the same site.
  if (!/^https?:\/\//i.test(url)) {
    const base = project.baseUrl.startsWith("/") ? null : new URL(project.baseUrl);
    const path = url.startsWith("/") ? url : `/${url}`;
    url = base ? new URL(path, base.origin).toString() : path;
  } else {
    try {
      url = normalizeUrl(url);
    } catch {
      return fail("That doesn't look like a valid URL");
    }
  }
  await upsertPage(project.id, url, { title: b?.title, visited: !!b?.visited });
  return ok(await listPages(project.id));
}
