import { member, ok } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/extension/me → who the extension is signed in as (extension token or session). */
export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  return ok({ userName: ctx.userName, email: ctx.email, workspaceName: ctx.workspaceName, workspaceId: ctx.workspaceId });
}
