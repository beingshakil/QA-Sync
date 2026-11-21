import * as cheerio from "cheerio";
import { FETCH_HEADERS, resolveTarget, selfOriginOf } from "@/server/fetch-guard";
import { getProject, getShare } from "@/server/repo";
import { getCtx } from "@/server/session";
import { FRAME_MARKER, escapeAttr, rewriteForReview } from "@/server/proxy-rewrite";
import { mintAssetToken, verifyAssetToken } from "@/server/proxy-token";
import { reportError } from "@/server/monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/proxy?url=<target>&scripts=1
 * Fetches the target page, adds <base href>, injects the reviewer agent, and serves it
 * same-origin so the canvas can talk to it. The canvas loads this inside a sandboxed iframe
 * (no allow-same-origin), so proxied scripts can't reach the app's cookies or storage.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  let raw = params.get("url");
  let frameToken = params.get("t");
  // A frame reloading itself arrives here via src/middleware.ts; the request still carries its
  // original query, so read the `__qasync=<token>~<page url>` marker directly.
  const marker = params.get(FRAME_MARKER);
  if (!raw && marker && marker.indexOf("~") > 0) {
    frameToken = marker.slice(0, marker.indexOf("~"));
    raw = marker.slice(marker.indexOf("~") + 1);
  }
  const self = selfOriginOf(req);
  if (!raw) return errorPage("Missing ?url=");

  let target: URL;
  try {
    target = resolveTarget(raw, self);
  } catch (e) {
    return errorPage((e as Error).message);
  }

  // Never an open proxy: signed-in members may load any site; guests (?s=<share token>) only
  // the site of the project their link covers. A frame reloading itself (routed here by
  // src/middleware.ts) carries no cookies, so it presents the signed token for its site instead.
  const tokenOk = !!frameToken && verifyAssetToken(frameToken) === target.origin;
  if (process.env.QASYNC_ALLOW_PUBLIC_PROXY !== "1" && !tokenOk && !(await getCtx())) {
    const share = params.get("s") ? await getShare(params.get("s")!) : null;
    const project = share ? await getProject(share.projectId) : null;
    const host = (h: string) => h.toLowerCase().replace(/^www\./, "");
    const projectHost = project ? (project.baseUrl.startsWith("/") ? new URL(self).hostname : new URL(project.baseUrl).hostname) : null;
    if (!projectHost || host(projectHost) !== host(target.hostname)) return errorPage("Sign in to load site previews.", 403);
  }

  // Screenshot mode: a page holding a captured image of the site (see shotPage), not the live HTML.
  if (params.get("shot") === "1") return shotPage(target, self);

  const isSelf = target.host === new URL(self).host;
  // Our own Next.js pages are server-rendered; their client router would fight the proxy URL.
  // thumb=1: a static, script-free snapshot for project-card previews (no reviewer agent).
  const thumb = params.get("thumb") === "1";
  const keepScripts = !thumb && (params.get("scripts") === "1" || (params.get("scripts") !== "0" && !isSelf));

  // Switching device / zoom / compare re-mounts the frame; serve a recent copy instead of
  // re-downloading the site. The canvas "Reload" button changes `r`, which forces a fresh fetch.
  const cacheKey = `${target}|${keepScripts ? 1 : 0}|${thumb ? "t" : ""}|${self}|${params.get("r") ?? "0"}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return htmlResponse(hit.html, hit.status, "hit");

  // Split view mounts two or three frames at once with the same URL: they share one upstream
  // fetch and rewrite instead of each downloading and processing the page.
  let job = INFLIGHT.get(cacheKey);
  if (!job) {
    job = loadPage(target, { keepScripts, thumb, self }).finally(() => INFLIGHT.delete(cacheKey));
    INFLIGHT.set(cacheKey, job);
  }
  const page = await job;
  if (page instanceof Response) return page.clone();
  CACHE.set(cacheKey, { ...page, at: Date.now() });
  if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value!);
  return htmlResponse(page.html, page.status, "miss");
}

type Page = { html: string; status: number };

async function loadPage(target: URL, { keepScripts, thumb, self }: { keepScripts: boolean; thumb: boolean; self: string }): Promise<Page | Response> {
  let res: Response;
  try {
    res = await fetch(target, { headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
  } catch (e) {
    const why = (e as Error).name === "TimeoutError" ? "timed out after 15 s" : (e as Error).message;
    reportError({ kind: "proxy", message: `Couldn't reach the site: ${why}`, url: target.toString() });
    return errorPage(`Couldn't reach ${target.host}: ${why}`);
  }
  // Still served (the canvas shows what the site sent), but worth knowing: often bot protection (403/429/503).
  if (res.status >= 400) reportError({ kind: "proxy", message: `The site answered HTTP ${res.status}`, url: res.url || target.toString() });

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) {
    // Buffered so concurrent callers can each get a copy of the shared result.
    return new Response(await res.arrayBuffer(), { status: res.status, headers: { "content-type": type || "application/octet-stream" } });
  }

  const finalUrl = res.url || target.toString();
  const text = await res.text();

  // Live review: fast text-level rewrite (see proxy-rewrite.ts).
  if (keepScripts && !thumb) {
    const token = mintAssetToken(new URL(finalUrl).origin);
    return { html: rewriteForReview(text, { finalUrl, status: res.status, self, token }), status: res.status };
  }

  // Thumbnails and our own pages drop every script; a parser is the safe way to do that.
  const $ = cheerio.load(text);

  $('meta[http-equiv="Content-Security-Policy" i]').remove();
  $('meta[http-equiv="refresh" i]').remove();
  $("base").remove();
  if (!keepScripts) {
    $("script").remove();
    $('link[rel="modulepreload"], link[as="script"]').remove();
    $("noscript").each((_, el) => {
      $(el).replaceWith($(el).html() ?? "");
    });
  }

  const head = $("head").length ? $("head") : $("html").prepend("<head></head>").find("head");
  head.prepend(
    thumb
      ? `<base href="${escapeAttr(finalUrl)}"><style>html,body{overflow:hidden!important}</style>`
      : `<base href="${escapeAttr(finalUrl)}">` +
          `<script>window.__QASYNC__=${JSON.stringify({ url: finalUrl, status: res.status })};</script>` +
          `<script src="${self}/reviewer.js" data-qasync></script>`,
  );

  return { html: $.html(), status: res.status };
}

/* Small in-memory cache of rewritten pages (per server process). Reload in the canvas changes
   `r`, so a fresh copy is always one click away. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 40;
const g = globalThis as unknown as { __fxProxyCache?: Map<string, Page & { at: number }>; __fxProxyInflight?: Map<string, Promise<Page | Response>> };
const CACHE = (g.__fxProxyCache ??= new Map());
const INFLIGHT = (g.__fxProxyInflight ??= new Map());

function htmlResponse(html: string, status: number, cache: "hit" | "miss") {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-qasync-status": String(status),
      "x-qasync-cache": cache,
    },
  });
}

/**
 * Screenshot mode: a minimal page with the reviewer agent and one full-width image, captured on the
 * server at the frame's own width (it asks for innerWidth). Pins anchor to the image, so the canvas
 * works as usual on sites that refuse to be framed.
 */
function shotPage(target: URL, self: string) {
  const token = mintAssetToken(target.origin);
  const src = `${self}/api/proxy/shot?url=${encodeURIComponent(target.toString())}&t=${encodeURIComponent(token)}`;
  const info = JSON.stringify({ url: target.toString(), status: 200, shot: true }).replace(/</g, "\\u003c");
  const host = escapeAttr(target.host);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${host} · screenshot</title>
<script>window.__QASYNC__=${info};</script>
<script src="${escapeAttr(self)}/reviewer.js" data-qasync></script>
<style>html,body{margin:0;background:#fff}#qasync-shot{display:block;width:100%;height:auto}
#qasync-wait{position:fixed;inset:0;display:grid;place-content:center;gap:6px;padding:24px;text-align:center;background:#f6f7fb;color:#3a4563;font:500 14px/1.5 system-ui,sans-serif}
#qasync-wait small{color:#5f6a84;font-weight:400}</style></head>
<body><div id="qasync-wait" role="status">Capturing a screenshot of ${host}…<small>This takes a few seconds.</small></div>
<img id="qasync-shot" alt="Screenshot of ${escapeAttr(target.toString())}">
<script>(function(){var img=document.getElementById("qasync-shot"),wait=document.getElementById("qasync-wait");
img.onload=function(){wait.remove()};
img.onerror=function(){wait.innerHTML="The screenshot couldn't be captured.<small>Use Reload to try again, or switch back to the live page.</small>"};
img.src=${JSON.stringify(src)}+"&w="+Math.round(window.innerWidth);})();</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function errorPage(msg: string, status = 200) {
  const html = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f7f7f4;color:#0e1116">
  <div style="max-width:440px;text-align:center"><div style="font-size:40px">⚠︎</div><h2 style="margin:8px 0">This page can't be loaded</h2>
  <p style="color:#6b717c">${msg.replace(/</g, "&lt;")}</p></div></body>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
