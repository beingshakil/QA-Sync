import { createProject, listProjects, upsertPage } from "@/server/repo";
import { fail, member, ok, readJson } from "@/server/http";
import { hostOf, normalizeUrl, pageKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  return ok(await listProjects(ctx.workspaceId));
}

/**
 * POST /api/projects { url, name?, figmaUrl? }
 * One project per site and workspace: if a project for this site already exists, it is reused
 * and the pasted URL is opened as a page of it, rather than creating a duplicate project.
 */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const body = await readJson<{ name?: string; url?: string; figmaUrl?: string }>(req);
  if (!body?.url?.trim()) return fail("A website URL is required");
  let url: string;
  try {
    url = body.url.trim().startsWith("/") ? body.url.trim() : normalizeUrl(body.url);
  } catch {
    return fail("That doesn't look like a valid URL");
  }

  const isPath = url.startsWith("/");
  const existing = (await listProjects(ctx.workspaceId)).find((p) =>
    isPath ? p.baseUrl.startsWith("/") && pageKey(p.baseUrl) === pageKey(url) : !p.baseUrl.startsWith("/") && hostOf(p.baseUrl).toLowerCase() === hostOf(url).toLowerCase(),
  );
  if (existing) {
    const samePage = pageKey(existing.baseUrl) === pageKey(url);
    if (!samePage) await upsertPage(existing.id, url);
    return ok({ ...existing, existing: true, openPage: samePage ? null : url });
  }

  const name = body.name?.trim() || hostOf(url);
  return ok({ ...(await createProject(ctx.workspaceId, { name, baseUrl: url, figmaUrl: body.figmaUrl?.trim() || null })), existing: false, openPage: null }, 201);
}
