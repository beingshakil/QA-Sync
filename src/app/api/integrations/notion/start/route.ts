import { NextResponse } from "next/server";
import { fail, member, projectFor } from "@/server/http";
import { selfOriginOf } from "@/server/fetch-guard";
import { authorizeUrl, makeState, notionConfigured } from "@/server/notion";

export const dynamic = "force-dynamic";

/** Where to come back to after Notion: an in-app path only (never another site). */
function safeBack(v: string | null): string | undefined {
  return v && v.startsWith("/app/") && !v.startsWith("//") && !/[\\\s]/.test(v) && v.length < 1500 ? v : undefined;
}

/** GET /api/integrations/notion/start?projectId=…[&back=/app/…]  →  Notion's consent screen. */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await notionConfigured(true))) return fail("Notion isn't set up yet. Open the Notion setup in QASync and paste the integration's keys.", 503);
  const params = new URL(req.url).searchParams;
  const project = await projectFor(ctx, params.get("projectId"));
  if (!project) return fail("Project not found", 404);
  const state = makeState({ workspaceId: ctx.workspaceId, userId: ctx.userId, projectId: project.id, back: safeBack(params.get("back")) });
  return NextResponse.redirect(await authorizeUrl(state, `${selfOriginOf(req)}/api/integrations/notion/callback`));
}
