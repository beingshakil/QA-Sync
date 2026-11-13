import { createProject, listProjects, upsertPage } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";
import { hostOf, normalizeUrl, pageKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
  return ok(listProjects());
}

/**
 * POST /api/projects { url, name?, figmaUrl? }
 * One project per site: if a project for this site already exists, it is reused and the
 * pasted URL is opened as a page of it, rather than creating a duplicate project.
 */
export async function POST(req: Request) {
  const body = await readJson<{ name?: string; url?: string; figmaUrl?: string }>(req);
  if (!body?.url?.trim()) return fail("A website URL is required");
  let url: string;
  try {
    url = body.url.trim().startsWith("/") ? body.url.trim() : normalizeUrl(body.url);
  } catch {
    return fail("That doesn't look like a valid URL");
  }

  const isPath = url.startsWith("/");
  const existing = listProjects().find((p) =>
    isPath ? p.baseUrl.startsWith("/") && pageKey(p.baseUrl) === pageKey(url) : !p.baseUrl.startsWith("/") && hostOf(p.baseUrl).toLowerCase() === hostOf(url).toLowerCase(),
  );
  if (existing) {
    const samePage = pageKey(existing.baseUrl) === pageKey(url);
    if (!samePage) upsertPage(existing.id, url);
    return ok({ ...existing, existing: true, openPage: samePage ? null : url });
  }

  const name = body.name?.trim() || hostOf(url);
  return ok({ ...createProject({ name, baseUrl: url, figmaUrl: body.figmaUrl?.trim() || null }), existing: false, openPage: null }, 201);
}
