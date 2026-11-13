import { addDesign, getProject, getShare, getUpload, listDesigns } from "@/server/repo";
import { fail, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/designs?projectId=…&pageUrl=…  (or ?shareToken=…) */
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  let projectId = sp.get("projectId");
  const token = sp.get("shareToken");
  if (token) {
    const share = getShare(token);
    if (!share) return fail("Invalid share link", 403);
    projectId = share.projectId;
  }
  if (!projectId) return fail("projectId is required");
  return ok(listDesigns(projectId, sp.get("pageUrl") ?? undefined));
}

/** POST /api/designs { projectId, pageUrl, device, uploadId } (members only) */
export async function POST(req: Request) {
  const b = await readJson<{ projectId?: string; pageUrl?: string; device?: string; uploadId?: string }>(req);
  if (!b?.projectId || !getProject(b.projectId)) return fail("Project not found", 404);
  if (!b.pageUrl) return fail("pageUrl is required");
  const up = b.uploadId ? getUpload(b.uploadId) : null;
  if (!up || !up.mime.startsWith("image/")) return fail("Upload an image of the design (PNG, JPG or WebP)");
  const device = ["desktop", "tablet", "mobile"].includes(b.device ?? "") ? b.device! : "desktop";
  return ok(addDesign(b.projectId, b.pageUrl, device, b.uploadId!), 201);
}
