import { revokeApiToken } from "@/server/tokens";
import { fail, ok } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/tokens/:id: revoke a token; anything using it stops working immediately. */
export async function DELETE(_req: Request, { params }: Ctx) {
  return revokeApiToken((await params).id) ? ok({ ok: true }) : fail("Not found", 404);
}
