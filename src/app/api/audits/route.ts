import { checkLimit, listAudits, saveAudit } from "@/server/repo";
import { fail, member, ok, projectFor, readJson } from "@/server/http";
import { runAudit } from "@/server/audit";
import { resolveTarget, selfOriginOf } from "@/server/fetch-guard";
import { pageKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/audits                         the workspace's 50 newest audits
 *  GET /api/audits?projectId=…            all audits for a project (newest first)
 *  GET /api/audits?projectId=…&page=<url>  the newest audit of that page, or null */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const params = new URL(req.url).searchParams;
  const projectId = params.get("projectId");
  if (!projectId) return ok(await listAudits({ workspaceId: ctx.workspaceId }));
  const project = await projectFor(ctx, projectId);
  if (!project) return fail("Project not found", 404);
  const audits = await listAudits({ projectId: project.id });
  const page = params.get("page");
  if (page) return ok(audits.find((a) => pageKey(a.url) === pageKey(page)) ?? null);
  return ok(audits);
}

export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string; url?: string }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  const limited = await checkLimit(ctx.workspaceId, "audits");
  if (limited) return fail(limited, 402);
  const raw = b?.url?.trim() || project.baseUrl;
  try {
    const target = resolveTarget(raw, selfOriginOf(req));
    const result = await runAudit(target.toString());
    return ok(await saveAudit({ projectId: project.id, url: raw, ...result }), 201);
  } catch (e) {
    return fail(`Audit failed: ${(e as Error).message}`, 422);
  }
}
