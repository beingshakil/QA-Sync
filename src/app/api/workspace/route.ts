import { getWorkspace, updateWorkspace } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";
import type { Workspace } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  return ok(getWorkspace());
}

export async function PATCH(req: Request) {
  const b = await readJson<Partial<Workspace>>(req);
  if (!b) return fail("Invalid body");
  if (b.members && (!Array.isArray(b.members) || b.members.length > 50)) return fail("Members must be a list (max 50)");
  return ok(updateWorkspace(b));
}
