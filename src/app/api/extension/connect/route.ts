import { auth } from "@/auth";
import { fail, member, ok, readJson } from "@/server/http";
import { createApiToken } from "@/server/tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/extension/connect  { browser?: string }  →  { token, userName, workspaceName }
 * Mints a token for the QASync browser extension (see src/server/tokens.ts). Needs a real signed-in
 * session, never an extension token, and only runs on a click on /app/extension.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return fail("Sign in to connect the extension", 401);
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ browser?: string }>(req);
  const browser = (b?.browser ?? "").replace(/[^\w .-]/g, "").trim().slice(0, 40) || "Browser";
  const day = new Date().toISOString().slice(0, 10);
  const { token, record } = await createApiToken(ctx.workspaceId, ctx.userId, `${browser} extension · ${day}`, "extension");
  return ok({ token, id: record.id, userName: ctx.userName, workspaceName: ctx.workspaceName }, 201);
}
