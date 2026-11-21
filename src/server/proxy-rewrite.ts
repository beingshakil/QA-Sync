/**
 * HTML and CSS rewriting for the review proxy (src/app/api/proxy/route.ts and the asset route
 * src/app/api/proxy/a/[token]/[...path]/route.ts).
 *
 * The canvas shows the proxied page in an iframe sandboxed WITHOUT allow-same-origin, so the page
 * runs in an opaque ("null") origin and can never reach the app's cookies or storage. That safety
 * has costs, and this module pays them:
 *
 *  1. Speed: the page is edited as text (targeted replacements) instead of being parsed into a DOM
 *     and re-serialised. On large pages the DOM round trip took 2-8 s; this takes milliseconds, and
 *     the markup reaches the browser exactly as the site sent it.
 *  2. Crashes: in an opaque origin, document.cookie / localStorage / sessionStorage and
 *     history.pushState/replaceState with a URL all throw. proxyShim() runs before any site script
 *     and swaps in in-memory stand-ins.
 *     The frame's URL is rewritten to the site's own path (client routers compare it while
 *     hydrating), carrying a marker so a reload comes back through the proxy (src/middleware.ts).
 *  3. CORS: a "null" origin fails every CORS check. Module scripts and fonts always load in CORS
 *     mode, so the site's own copies are routed through the asset route (which allows any origin),
 *     with an import map for module imports and font URLs rewritten in CSS. `integrity` /
 *     `crossorigin` on classic scripts and stylesheets force CORS for no gain, so they're dropped.
 *
 * Pure string code with no Node or Next imports, so it can be exercised outside the app.
 */

export type RewriteOptions = {
  /** Page URL after redirects; becomes <base href>. */
  finalUrl: string;
  /** Upstream HTTP status, shown in the canvas. */
  status: number;
  /** Our own origin, e.g. https://qasync.app */
  self: string;
  /** Signed token for the page's origin (src/server/proxy-token.ts): authorises the asset route
   *  and reloads. Without it, the CORS reroutes and URL rewrite are skipped. */
  token?: string;
};

/** Query parameter that marks a proxied page's rewritten URL; see proxyShim and src/middleware.ts. */
export const FRAME_MARKER = "__qasync";

/**
 * Runs first in <head>, before any site script. ES5 on purpose: it must never fail to parse.
 *  - in-memory localStorage / sessionStorage / document.cookie where the opaque origin forbids them
 *  - the frame's URL shows the site's own path (client routers compare it while hydrating), with a
 *    `__qasync=<token>~<page url>` marker so a reload is routed back through the proxy by the
 *    middleware instead of loading one of our pages
 *  - history.pushState/replaceState keep that mapping and never throw
 */
export function proxyShim(target: string, token: string): string {
  return `(function(){var T=${jsString(target)},K=${jsString(token)},M=${jsString(FRAME_MARKER)};
function mem(){var d=Object.create(null);return{getItem:function(k){k=String(k);return k in d?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d=Object.create(null)},key:function(i){var ks=Object.keys(d);return i<ks.length?ks[i]:null},get length(){return Object.keys(d).length}}}
["localStorage","sessionStorage"].forEach(function(n){try{window[n].length}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});
try{document.cookie}catch(e){var jar={};try{Object.defineProperty(document,"cookie",{configurable:true,get:function(){return Object.keys(jar).map(function(k){return k+"="+jar[k]}).join("; ")},set:function(v){var p=String(v).split(";")[0],i=p.indexOf("=");if(i>0)jar[p.slice(0,i).trim()]=p.slice(i+1).trim()}})}catch(_){}}
var own=location.protocol+"//"+location.host,t=null;try{t=new URL(T)}catch(e){}
var RX=new RegExp("([?&])"+M+"=[^&]*(&|$)");
function mark(x){var s=x.search.replace(RX,function(m,a,b){return b?a:""});if(s==="?")s="";return own+x.pathname+(s?s+"&":"?")+M+"="+encodeURIComponent(K+"~"+t.origin+x.pathname+s)+x.hash}
function toOwn(u){if(u==null||!t||!K)return u;try{var x=new URL(String(u),document.baseURI);if(x.origin===t.origin||x.origin===own)return mark(x)}catch(e){}return u}
var H=history,RS=H.replaceState,PS=H.pushState;
if(t&&K){try{RS.call(H,H.state,"",mark(t))}catch(e){}}
[["pushState",PS],["replaceState",RS]].forEach(function(p){if(!p[1])return;H[p[0]]=function(s,ti,u){try{return p[1].call(H,s,ti,arguments.length>2?toOwn(u):undefined)}catch(e){try{return p[1].call(H,s,ti)}catch(_){}}}});
})();`;
}

function jsString(s: string) {
  return JSON.stringify(s).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const CSP_META = /<meta\b[^>]*http-equiv\s*=\s*["']?\s*content-security-policy[^>]*>/gi;
const REFRESH_META = /<meta\b[^>]*http-equiv\s*=\s*["']?\s*refresh[^>]*>/gi;
const BASE_TAG = /<base\b[^>]*>/gi;
const SCRIPT_OPEN = /<script\b[^>]*>/gi;
const LINK_TAG = /<link\b[^>]*>/gi;
const STYLE_BLOCK = /(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi;
const INTEGRITY_ATTR = /\s+integrity\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const CROSSORIGIN_ATTR = /\s+crossorigin(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi;
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;

export function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Inserts `snippet` right after the opening <head> (or <html>, or at the very start). */
export function injectIntoHead(html: string, snippet: string): string {
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + snippet + html.slice(head.index + head[0].length);
  const root = /<html\b[^>]*>/i.exec(html);
  if (root) return html.slice(0, root.index + root[0].length) + `<head>${snippet}</head>` + html.slice(root.index + root[0].length);
  return snippet + html;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

function setAttr(tag: string, name: string, value: string): string {
  return tag.replace(new RegExp(`(\\s${name}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "i"), `$1"${escapeAttr(value)}"`);
}

function decodeAttr(v: string) {
  return v.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** The asset-route URL for `url` (resolved against `base`) when it's on `origin`; else null. */
export function toAssetUrl(url: string, base: string, origin: string, assetBase: string): string | null {
  const v = url.trim();
  if (!v || /^(?:data|blob|javascript|about):/i.test(v) || v.startsWith("#")) return null;
  try {
    const u = new URL(decodeAttr(v), base);
    return u.origin === origin ? assetBase + u.pathname + u.search : null;
  } catch {
    return null;
  }
}

/**
 * Rewrites url(...) and @import in CSS whose own URL is `cssUrl`:
 *  - fonts and @import on `origin` → the asset route (fonts need CORS; imported CSS needs this pass)
 *  - other relative URLs → absolute URLs on the site (so images load straight from the site)
 * With `fontsOnly`, only font URLs are touched (inline <style>, where relative URLs already
 * resolve against <base href>).
 */
export function rewriteCss(css: string, cssUrl: string, origin: string, assetBase: string, fontsOnly = false): string {
  const map = (raw: string, isImport: boolean): string | null => {
    const v = raw.trim();
    if (!v || /^(?:data|blob|#)/i.test(v) || v.startsWith("%23")) return null;
    if (isImport || FONT_FILE.test(v)) return toAssetUrl(v, cssUrl, origin, assetBase);
    if (fontsOnly || /^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
    try {
      return new URL(v, cssUrl).href;
    } catch {
      return null;
    }
  };
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q: string, u: string) => {
      const v = map(u, false);
      return v ? `url(${q || '"'}${v}${q || '"'})` : m;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q: string, u: string) => {
      const v = map(u, true);
      return v ? `@import ${q}${v}${q}` : m;
    });
}

/** Rewrites a page for the review canvas (see the module comment). */
export function rewriteForReview(html: string, opts: RewriteOptions): string {
  const { finalUrl, self, token } = opts;
  const assetBase = token ? `${self}/api/proxy/a/${token}` : undefined;
  const origin = new URL(finalUrl).origin;
  const toAsset = (u: string | null) => (u && assetBase ? toAssetUrl(u, finalUrl, origin, assetBase) : null);
  let hasModules = false;

  let out = html.replace(CSP_META, "").replace(REFRESH_META, "").replace(BASE_TAG, "");

  out = out.replace(SCRIPT_OPEN, (tag) => {
    if (/\btype\s*=\s*["']?module/i.test(tag)) {
      hasModules = true;
      const to = toAsset(attr(tag, "src"));
      return to ? setAttr(tag, "src", to) : tag;
    }
    // Classic scripts: no SRI / CORS mode (a "null" origin fails those checks).
    return tag.replace(INTEGRITY_ATTR, "").replace(CROSSORIGIN_ATTR, "");
  });

  out = out.replace(LINK_TAG, (tag) => {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const as = (attr(tag, "as") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (rel.includes("modulepreload")) {
      hasModules = true;
      const to = toAsset(href);
      return to ? setAttr(tag, "href", to) : tag;
    }
    // Fonts load in CORS mode: point the preload at the asset route and keep crossorigin.
    if (rel.includes("preload") && as === "font") {
      const to = toAsset(href);
      return to ? setAttr(tag, "href", to) : tag;
    }
    if (rel.includes("stylesheet") || (rel.includes("preload") && as === "style")) {
      // The site's own stylesheets go through the asset route so their fonts load (see rewriteCss).
      const to = toAsset(href);
      const t = tag.replace(INTEGRITY_ATTR, "").replace(CROSSORIGIN_ATTR, "");
      return to ? setAttr(t, "href", to) : t;
    }
    if (rel.includes("preload") || rel.includes("prefetch")) return tag.replace(INTEGRITY_ATTR, "").replace(CROSSORIGIN_ATTR, "");
    return tag;
  });

  if (assetBase) {
    out = out.replace(STYLE_BLOCK, (_m, open: string, css: string, close: string) => open + rewriteCss(css, finalUrl, origin, assetBase, true) + close);
  }

  // Module imports that resolve to the site (or, from a rerouted module, to our own origin) go
  // through the asset route; the asset route itself maps to itself. Skipped when the page already
  // ships an import map, since older browsers honour only the first one.
  const importMap =
    assetBase && hasModules && !/<script\b[^>]*type\s*=\s*["']?importmap/i.test(out)
      ? `<script type="importmap">${JSON.stringify({ imports: { [`${origin}/`]: `${assetBase}/`, [`${self}/`]: `${assetBase}/`, [`${self}/api/proxy/a/`]: `${self}/api/proxy/a/` } }).replace(/</g, "\\u003c")}</script>`
      : "";

  const inject =
    `<base href="${escapeAttr(finalUrl)}">` +
    `<script>${proxyShim(finalUrl, token ?? "")}</script>` +
    importMap +
    `<script>window.__QASYNC__=${JSON.stringify({ url: finalUrl, status: opts.status }).replace(/</g, "\\u003c")};</script>` +
    `<script src="${escapeAttr(self)}/reviewer.js" data-qasync></script>`;
  return injectIntoHead(out, inject);
}
