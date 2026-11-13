import * as cheerio from "cheerio";
import { FETCH_HEADERS, resolveTarget, selfOriginOf } from "@/server/fetch-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/proxy?url=<target>&scripts=1
 * Fetches the target page, adds <base href>, injects the reviewer agent, and serves it
 * same-origin so the canvas can talk to it. The canvas loads this inside a sandboxed iframe
 * (no allow-same-origin), so proxied scripts can't reach the app's cookies or storage.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const raw = params.get("url");
  const self = selfOriginOf(req);
  if (!raw) return errorPage("Missing ?url=");

  let target: URL;
  try {
    target = resolveTarget(raw, self);
  } catch (e) {
    return errorPage((e as Error).message);
  }

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

  let res: Response;
  try {
    res = await fetch(target, { headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return errorPage(`Couldn't reach ${target.host}: ${(e as Error).message}`);
  }

  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) {
    return new Response(res.body, { status: res.status, headers: { "content-type": type || "application/octet-stream" } });
  }

  const finalUrl = res.url || target.toString();
  const $ = cheerio.load(await res.text());

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

  const html = $.html();
  CACHE.set(cacheKey, { html, status: res.status, at: Date.now() });
  if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value!);
  return htmlResponse(html, res.status, "miss");
}

/* Small in-memory cache of rewritten pages (per server process). */
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX = 60;
const CACHE: Map<string, { html: string; status: number; at: number }> =
  ((globalThis as unknown as { __fxProxyCache?: Map<string, { html: string; status: number; at: number }> }).__fxProxyCache ??= new Map());

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

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function errorPage(msg: string) {
  const html = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f7f7f4;color:#0e1116">
  <div style="max-width:440px;text-align:center"><div style="font-size:40px">⚠︎</div><h2 style="margin:8px 0">This page can't be loaded</h2>
  <p style="color:#6b717c">${msg.replace(/</g, "&lt;")}</p></div></body>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
