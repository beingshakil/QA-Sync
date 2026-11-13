import fs from "node:fs/promises";
import path from "node:path";
import { getUpload } from "@/server/repo";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const u = getUpload((await params).id);
  if (!u) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(process.cwd(), ".data", "uploads", path.basename(u.file)));
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": u.mime,
        "content-disposition": `inline; filename="${u.name.replace(/"/g, "")}"`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, max-age=31536000, immutable",
        // Allow the sandboxed (opaque-origin) review frame to load design overlays.
        "access-control-allow-origin": "*",
        "cross-origin-resource-policy": "cross-origin",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
