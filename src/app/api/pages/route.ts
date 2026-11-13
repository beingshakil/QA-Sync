import { getProject, getShare, listPages, upsertPage } from "@/server/repo";
import { actorFrom, fail, ok, readJson } from "@/server/http";
import { normalizeUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/pages?projectId=…  (or ?shareToken=…) → pages with QA state and issue counts */
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  let projectId = sp.get("projectId");
  const token = sp.get("shareToken");
  if (token) {
    const share = getShare(token);
    if (!share) return fail("Invalid share link", 403);
    projectId = share.projectId;
  }
  if (!projectId || !getProject(projectId)) return fail("Project not found", 404);
  return ok(listPages(projectId));
}

/** POST /api/pages { projectId, url, title?, visited? }: register a page (visit or manual add) */
export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string; url?: string; title?: string; visited?: boolean; shareToken?: string; guestName?: string }>(req);
  const actor = actorFrom(b);
  if ("error" in actor) return fail(actor.error, 403);
  const projectId = actor.kind === "guest" ? actor.projectId : b?.projectId;
  const project = projectId ? getProject(projectId) : null;
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
  upsertPage(project.id, url, { title: b?.title, visited: !!b?.visited });
  return ok(listPages(project.id));
}
