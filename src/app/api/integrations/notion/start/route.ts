import { NextResponse } from "next/server";
import { fail, member, projectFor } from "@/server/http";
import { selfOriginOf } from "@/server/fetch-guard";
import { authorizeUrl, makeState, notionConfigured } from "@/server/notion";

export const dynamic = "force-dynamic";

/** GET /api/integrations/notion/start?projectId=…  →  Notion's consent screen. */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!notionConfigured()) return fail("Notion isn't set up on this server yet (NOTION_CLIENT_ID / NOTION_CLIENT_SECRET)", 503);
  const project = await projectFor(ctx, new URL(req.url).searchParams.get("projectId"));
  if (!project) return fail("Project not found", 404);
  const state = makeState({ workspaceId: ctx.workspaceId, userId: ctx.userId, projectId: project.id });
  return NextResponse.redirect(authorizeUrl(state, `${selfOriginOf(req)}/api/integrations/notion/callback`));
}
