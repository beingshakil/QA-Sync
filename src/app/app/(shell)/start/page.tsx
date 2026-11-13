import { redirect } from "next/navigation";
import { checkLimit, createProject, listProjects, upsertPage } from "@/server/repo";
import { requireCtx } from "@/server/session";
import { hostOf, normalizeUrl, pageKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /app/start?url=<site>: where "Start reviewing" lands after sign-in. Opens the site in the
 * review canvas, reusing the workspace's project for that site if there is one.
 */
export default async function StartPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const ctx = await requireCtx();
  const raw = (await searchParams).url?.trim();
  let url: string;
  try {
    url = normalizeUrl(raw ?? "");
  } catch {
    redirect("/app/projects");
  }
  const existing = (await listProjects(ctx.workspaceId)).find((p) => !p.baseUrl.startsWith("/") && hostOf(p.baseUrl).toLowerCase() === hostOf(url).toLowerCase());
  if (existing) {
    const samePage = pageKey(existing.baseUrl) === pageKey(url);
    if (!samePage) await upsertPage(existing.id, url);
    redirect(`/app/projects/${existing.id}/review${samePage ? "" : `?page=${encodeURIComponent(url)}`}`);
  }
  if (await checkLimit(ctx.workspaceId, "projects")) redirect("/app/projects?limit=projects");
  const project = await createProject(ctx.workspaceId, { name: hostOf(url), baseUrl: url });
  redirect(`/app/projects/${project.id}/review`);
}
