import { resolveTarget, selfOriginOf } from "@/server/fetch-guard";
import { verifyAssetToken } from "@/server/proxy-token";
import { captureScreenshot, shotWidth } from "@/server/screenshot";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/proxy/shot?url=<page>&w=<css width>&t=<site token>
 * The screenshot image for the canvas's screenshot mode (the page around it comes from
 * /api/proxy?shot=1). Requested from inside the sandboxed frame, so it carries no cookies: the
 * signed token, minted by the proxy for this site, is the authorisation.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  let target: URL;
  try {
    target = resolveTarget(params.get("url") ?? "", selfOriginOf(req));
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  const token = params.get("t") ?? "";
  if (verifyAssetToken(token) !== target.origin) return new Response("Forbidden", { status: 403 });

  try {
    const shot = await captureScreenshot(target.toString(), shotWidth(params.get("w")));
    return new Response(new Uint8Array(shot.bytes), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=600",
        "cross-origin-resource-policy": "cross-origin",
        "x-qasync-status": String(shot.status),
      },
    });
  } catch (e) {
    reportError({ kind: "shot", message: `Screenshot failed: ${(e as Error).message.split("\n")[0]}`, url: target.toString() });
    return new Response("Screenshot failed", { status: 502 });
  }
}
