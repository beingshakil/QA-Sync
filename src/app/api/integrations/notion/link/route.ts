import { fail, member, ok, projectFor, readJson } from "@/server/http";
import { NOTION_MODES, adoptDatabase, createDatabase, getIntegration, linkProject, setMode, unlinkProject, type NotionMode } from "@/server/notion";

export const dynamic = "force-dynamic";

/** POST { projectId, parentPageId | databaseId, mode }: create the QASync database under a page, or use an existing database. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string; parentPageId?: string; databaseId?: string; mode?: NotionMode }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  const integ = await getIntegration(ctx.workspaceId);
  if (!integ) return fail("Connect Notion first", 409);
  const mode = b?.mode && NOTION_MODES.includes(b.mode) ? b.mode : "all";
  try {
    const db = b?.databaseId ? await adoptDatabase(integ.token, b.databaseId) : b?.parentPageId ? await createDatabase(integ.token, b.parentPageId, project.name) : null;
    if (!db) return fail("Pick a page or a database");
    await linkProject(project.id, { databaseId: db.databaseId, url: db.url, props: db.props }, mode);
    return ok({ databaseId: db.databaseId, databaseUrl: db.url, mode }, 201);
  } catch (e) {
    return fail(`Notion: ${(e as Error).message}`, 502);
  }
}

/** PATCH { projectId, mode } */
export async function PATCH(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string; mode?: NotionMode }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  if (!b?.mode || !NOTION_MODES.includes(b.mode)) return fail("Unknown mode");
  await setMode(project.id, b.mode);
  return ok({ mode: b.mode });
}

/** DELETE ?projectId=…  →  stop sending this project (rows already in Notion stay). */
export async function DELETE(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const project = await projectFor(ctx, new URL(req.url).searchParams.get("projectId"));
  if (!project) return fail("Project not found", 404);
  await unlinkProject(project.id);
  return ok({ ok: true });
}
