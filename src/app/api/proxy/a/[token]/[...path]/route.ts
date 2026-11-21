import { FETCH_HEADERS, selfOriginOf } from "@/server/fetch-guard";
import { rewriteCss } from "@/server/proxy-rewrite";
import { verifyAssetToken } from "@/server/proxy-token";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/proxy/a/<token>/<path>
 * Serves a proxied page's own module scripts, stylesheets and fonts with CORS open, because the
 * page runs in an opaque origin and those loads always use CORS (see src/server/proxy-rewrite.ts).
 * The token (minted by the page proxy) names the one origin it may fetch from; no cookies needed.
 *
 * Never an HTML proxy: only script, style, font, wasm, JSON and image types are passed through, and
 * every response carries `Content-Security-Policy: sandbox` and `nosniff`, so nothing fetched here can
 * run as a page on our origin.
 */
const ALLOWED = /javascript|ecmascript|text\/css|^font\/|application\/(?:x-)?font|vnd\.ms-fontobject|application\/wasm|application\/json|^image\//i;
const FONT_PATH = /\.(?:woff2?|ttf|otf|eot)$/i;

export async function GET(req: Request, { params }: { params: Promise<{ token: string; path: string[] }> }) {
  const { token, path } = await params;
  const origin = verifyAssetToken(token);
  if (!origin) return deny(403, "Invalid or expired asset token");

  const pathname = "/" + path.map(encodeURIComponent).join("/");
  const upstream = new URL(pathname + new URL(req.url).search, origin);
  if (upstream.origin !== origin) return deny(400, "Bad path");

  let res: Response;
  try {
    res = await fetch(upstream, { headers: { ...FETCH_HEADERS, accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  } catch (e) {
    reportError({ kind: "asset", message: `Asset unreachable: ${(e as Error).message}`, url: upstream.toString() });
    return deny(502, "Upstream unreachable");
  }
  if (!res.ok) {
    reportError({ kind: "asset", message: `Asset answered HTTP ${res.status}`, url: upstream.toString() });
    return deny(res.status, "Upstream error");
  }

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const fontByPath = FONT_PATH.test(upstream.pathname) && (!type || type === "application/octet-stream");
  if (!ALLOWED.test(type) && !fontByPath) {
    reportError({ kind: "asset", message: `Asset type not proxied: ${type || "none"}`, url: upstream.toString() });
    return deny(415, "Type not proxied");
  }

  const headers = {
    "content-type": res.headers.get("content-type") || (fontByPath ? "font/woff2" : "application/octet-stream"),
    "access-control-allow-origin": "*",
    "cross-origin-resource-policy": "cross-origin",
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox",
    "cache-control": "public, max-age=3600",
  };

  if (type === "text/css") {
    const assetBase = `${selfOriginOf(req)}/api/proxy/a/${token}`;
    return new Response(rewriteCss(await res.text(), res.url || upstream.toString(), origin, assetBase), { headers });
  }
  return new Response(res.body, { headers });
}

function deny(status: number, msg: string) {
  return new Response(msg, { status, headers: { "access-control-allow-origin": "*", "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" } });
}
