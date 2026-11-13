import { createApiToken, listApiTokens } from "@/server/tokens";
import { fail, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/tokens: the workspace's API tokens (never the raw token). */
export function GET() {
  return ok(listApiTokens());
}

/** POST /api/tokens { name }: returns the raw token once. */
export async function POST(req: Request) {
  const b = await readJson<{ name?: string }>(req);
  const name = (b?.name ?? "").trim().slice(0, 60);
  if (!name) return fail("Give the token a name, e.g. the tool that will use it");
  return ok(createApiToken(name), 201);
}
