import { getOrCreateShare } from "@/server/repo";
import { fail, member, ok, projectFor, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  const share = await getOrCreateShare(project.id);
  return ok({ ...share, path: `/r/${share.token}` });
}
