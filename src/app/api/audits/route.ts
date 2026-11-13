import { getProject, listAudits, saveAudit } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";
import { runAudit } from "@/server/audit";
import { resolveTarget, selfOriginOf } from "@/server/fetch-guard";
import { pageKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/audits?projectId=…            all audits for a project (newest first)
 *  GET /api/audits?projectId=…&page=<url>  the newest audit of that page, or null */
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const projectId = params.get("projectId") ?? undefined;
  const page = params.get("page");
  const audits = listAudits(projectId);
  if (page) return ok(audits.find((a) => pageKey(a.url) === pageKey(page)) ?? null);
  return ok(audits);
}

export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string; url?: string }>(req);
  const project = b?.projectId ? getProject(b.projectId) : null;
  if (!project) return fail("Project not found", 404);
  const raw = b?.url?.trim() || project.baseUrl;
  try {
    const target = resolveTarget(raw, selfOriginOf(req));
    const result = await runAudit(target.toString());
    return ok(saveAudit({ projectId: project.id, url: raw, ...result }), 201);
  } catch (e) {
    return fail(`Audit failed: ${(e as Error).message}`, 422);
  }
}
