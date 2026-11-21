import { NextResponse } from "next/server";
import { selfOriginOf } from "@/server/fetch-guard";
import { getCtx } from "@/server/session";
import { exchangeCode, readState, saveIntegration } from "@/server/notion";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/** GET /api/integrations/notion/callback?code=…&state=…  →  back to the project's settings tab. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const self = selfOriginOf(req);
  const state = readState(params.get("state"));
  const back = (projectId: string | undefined, result: string) =>
    NextResponse.redirect(projectId ? `${self}/app/projects/${projectId}?tab=settings&notion=${result}` : `${self}/app/projects?notion=${result}`);
  if (!state) return back(undefined, "expired");
  const ctx = await getCtx();
  // The same person, in the same workspace, must finish what they started.
  if (!ctx || ctx.userId !== state.userId || ctx.workspaceId !== state.workspaceId) return back(state.projectId, "denied");
  if (params.get("error") || !params.get("code")) return back(state.projectId, "cancelled");
  try {
    const { token, accountName } = await exchangeCode(params.get("code")!, `${self}/api/integrations/notion/callback`);
    await saveIntegration(state.workspaceId, state.userId, token, accountName);
    return back(state.projectId, "connected");
  } catch (e) {
    reportError({ kind: "integration", message: `Notion connect: ${(e as Error).message}` });
    return back(state.projectId, "failed");
  }
}
