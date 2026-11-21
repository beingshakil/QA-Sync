import { fail, member, ok } from "@/server/http";
import { getIntegration, searchTargets } from "@/server/notion";

export const dynamic = "force-dynamic";

/** GET /api/integrations/notion/targets?q=…  →  pages and databases shared with QASync. */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const integ = await getIntegration(ctx.workspaceId);
  if (!integ) return fail("Connect Notion first", 409);
  try {
    return ok(await searchTargets(integ.token, new URL(req.url).searchParams.get("q") ?? ""));
  } catch (e) {
    return fail(`Notion: ${(e as Error).message}`, 502);
  }
}
