import { getProject, listAudits, saveAudit } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";
import { runAudit } from "@/server/audit";
import { resolveTarget, selfOriginOf } from "@/server/fetch-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;
  return ok(listAudits(projectId));
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
