import { fail, member, ok, projectFor, readJson } from "@/server/http";
import { driveFail, syncPageSheet } from "@/server/google";

export const dynamic = "force-dynamic";

/**
 * POST { projectId, pageUrl }  →  { url, folderUrl, updated, rows, ownerEmail }
 * Writes every comment on the page into its sheet (QASync / <project> / <page>). From then on the
 * sheet updates by itself when comments change. The first person to send a project owns its folder.
 */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string; pageUrl?: string }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  if (!b?.pageUrl) return fail("Which page?");
  try {
    return ok(await syncPageSheet(project.id, b.pageUrl, ctx.userId));
  } catch (e) {
    return driveFail(e);
  }
}
