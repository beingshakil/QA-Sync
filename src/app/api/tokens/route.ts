import { createApiToken, listApiTokens } from "@/server/tokens";
import { fail, member, ok, readJson } from "@/server/http";
import { requireFeature } from "@/server/repo";

export const dynamic = "force-dynamic";

/** GET /api/tokens: the workspace's API tokens (never the raw token). */
export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  return ok(await listApiTokens(ctx.workspaceId));
}

/** POST /api/tokens { name }: returns the raw token once. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const off = await requireFeature(ctx.workspaceId, "agents");
  if (off) return fail(off, 402);
  const b = await readJson<{ name?: string }>(req);
  const name = (b?.name ?? "").trim().slice(0, 60);
  if (!name) return fail("Give the token a name, e.g. the tool that will use it");
  return ok(await createApiToken(ctx.workspaceId, ctx.userId, name), 201);
}
