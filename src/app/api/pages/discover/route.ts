import { getProject, listPages, upsertPage } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";
import { discoverPages } from "@/server/discover";
import { resolveTarget, selfOriginOf } from "@/server/fetch-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/pages/discover { projectId }: import pages from the sitemap or the start page's links (members) */
export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string }>(req);
  const project = b?.projectId ? getProject(b.projectId) : null;
  if (!project) return fail("Project not found", 404);
  try {
    const self = selfOriginOf(req);
    const target = resolveTarget(project.baseUrl, self);
    const { urls, source } = await discoverPages(target.toString());
    const isSelf = target.host === new URL(self).host;
    const before = listPages(project.id).length;
    for (const u of urls) {
      // Pages on this app's own origin are stored as paths, like the project's base URL.
      const url = isSelf ? new URL(u).pathname + new URL(u).search : u;
      upsertPage(project.id, url);
    }
    const pages = listPages(project.id);
    return ok({ pages, added: pages.length - before, source });
  } catch (e) {
    return fail(`Couldn't read the site: ${(e as Error).message}`, 422);
  }
}
