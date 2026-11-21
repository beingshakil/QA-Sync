import { fail, member, ok, projectFor, readJson } from "@/server/http";
import { linkedProjects, syncProject } from "@/server/notion";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { projectId }  →  pull status changes from Notion now ("Sync now"). */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  try {
    return ok(await syncProject(project.id));
  } catch (e) {
    reportError({ kind: "integration", message: `Notion sync: ${(e as Error).message}` });
    return fail(`Notion: ${(e as Error).message}`, 502);
  }
}

/** GET with `Authorization: Bearer $CRON_SECRET` (Vercel Cron, optional): sync every linked project. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Not found", 404);
  let synced = 0;
  for (const id of await linkedProjects()) {
    try {
      await syncProject(id);
      synced++;
    } catch (e) {
      reportError({ kind: "integration", message: `Notion sync: ${(e as Error).message}` });
    }
  }
  return ok({ synced });
}
