import "server-only";
import * as cheerio from "cheerio";
import { FETCH_HEADERS } from "./fetch-guard";

const ASSET = /\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|mp4|mp3|webm|css|js|json|xml|txt)$/i;
const LIMIT = 60;

/**
 * Find a site's pages so the QA checklist exists before review starts.
 * Tries /sitemap.xml (and one level of sitemap index), then falls back to same-site links on the start page.
 */
export async function discoverPages(baseUrl: string): Promise<{ urls: string[]; source: "sitemap" | "links" }> {
  const base = new URL(baseUrl);
  const sameSite = (u: URL) => u.host === base.host && /^https?:$/.test(u.protocol) && !ASSET.test(u.pathname);
  const clean = (u: URL) => {
    u.hash = "";
    u.search = "";
    return u.toString();
  };

  // 1. sitemap
  try {
    const locs = await sitemapLocs(new URL("/sitemap.xml", base.origin).toString());
    const urls = [...new Set(locs.map((l) => new URL(l)).filter(sameSite).map(clean))].slice(0, LIMIT);
    if (urls.length) return { urls, source: "sitemap" };
  } catch {
    /* fall through to links */
  }

  // 2. links on the start page
  const res = await fetch(base, { headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
  const $ = cheerio.load(await res.text());
  const found = new Set<string>([clean(new URL(res.url || base.toString()))]);
  $("a[href]").each((_, el) => {
    const h = $(el).attr("href")!.trim();
    if (!h || h.startsWith("#") || /^(mailto|tel|javascript):/i.test(h)) return;
    try {
      const u = new URL(h, res.url || base);
      if (sameSite(u)) found.add(clean(u));
    } catch {
      /* skip */
    }
  });
  return { urls: [...found].slice(0, LIMIT), source: "links" };
}

async function sitemapLocs(url: string, depth = 0): Promise<string[]> {
  const r = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`sitemap ${r.status}`);
  const $ = cheerio.load(await r.text(), { xmlMode: true });
  const nested = $("sitemap > loc").map((_, el) => $(el).text().trim()).get();
  if (nested.length && depth === 0) {
    const all: string[] = [];
    for (const n of nested.slice(0, 5)) {
      try {
        all.push(...(await sitemapLocs(n, 1)));
      } catch {
        /* skip broken child sitemaps */
      }
      if (all.length >= LIMIT) break;
    }
    return all;
  }
  return $("url > loc").map((_, el) => $(el).text().trim()).get();
}
