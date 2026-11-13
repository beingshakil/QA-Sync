import { getOrCreateShare, getProject } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string }>(req);
  if (!b?.projectId || !getProject(b.projectId)) return fail("Project not found", 404);
  const share = getOrCreateShare(b.projectId);
  return ok({ ...share, path: `/r/${share.token}` });
}
