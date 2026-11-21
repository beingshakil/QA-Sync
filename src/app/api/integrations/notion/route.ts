import { fail, member, ok, projectFor } from "@/server/http";
import { disconnectNotion, getIntegration, getLink, notionConfigured } from "@/server/notion";

export const dynamic = "force-dynamic";

/** GET /api/integrations/notion?projectId=…  →  the workspace's connection and this project's link. */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const projectId = new URL(req.url).searchParams.get("projectId");
  const project = projectId ? await projectFor(ctx, projectId) : null;
  const integ = await getIntegration(ctx.workspaceId);
  const link = project ? await getLink(project.id) : null;
  return ok({
    configured: notionConfigured(),
    connected: !!integ,
    accountName: integ?.accountName ?? null,
    link: link ? { databaseId: link.databaseId, databaseUrl: link.databaseUrl, mode: link.mode, lastSyncAt: link.lastSyncAt } : null,
  });
}

/** DELETE /api/integrations/notion  →  disconnect Notion from this workspace (rows already in Notion stay). */
export async function DELETE() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await getIntegration(ctx.workspaceId))) return fail("Not connected", 404);
  await disconnectNotion(ctx.workspaceId);
  return ok({ ok: true });
}
