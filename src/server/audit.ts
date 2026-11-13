import "server-only";
import * as cheerio from "cheerio";
import type { AuditFinding, SeoImage, SeoLink, SeoReport, SeoSchemaItem } from "@/lib/types";
import { FETCH_HEADERS } from "./fetch-guard";
import { linkState } from "@/lib/seo-checks";

/**
 * Phase 1 page audit (runs inline). Swap path: audit-worker with Playwright + axe-core + Lighthouse.
 * Checks: broken links, SEO basics, accessibility basics, font sprawl, common misspellings.
 */

const MISSPELLINGS: Record<string, string> = {
  teh: "the", recieve: "receive", seperate: "separate", occured: "occurred", definately: "definitely",
  accomodate: "accommodate", untill: "until", wich: "which", adress: "address", existance: "existence",
  goverment: "government", enviroment: "environment", succesful: "successful", tommorow: "tomorrow",
  begining: "beginning", beleive: "believe", calender: "calendar", collegue: "colleague", concious: "conscious",
  embarass: "embarrass", independant: "independent", neccessary: "necessary", noticable: "noticeable",
  occurence: "occurrence", persue: "pursue", publically: "publicly", recomend: "recommend", refered: "referred",
  relevent: "relevant", wierd: "weird", acheive: "achieve", arguement: "argument", buisness: "business",
  comming: "coming", experiance: "experience", garantee: "guarantee", knowlege: "knowledge", lenght: "length",
  maintainance: "maintenance", millenium: "millennium", posession: "possession", priviledge: "privilege",
  reccomend: "recommend", responsability: "responsibility", shedule: "schedule", truely: "truly", usefull: "useful",
};

const WEIGHTS = { error: 9, warning: 4, info: 1 } as const;

export async function runAudit(url: string): Promise<{ score: number; findings: AuditFinding[]; stats: Record<string, number | string>; seo: SeoReport }> {
  const findings: AuditFinding[] = [];
  const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    findings.push({ rule: "page-status", severity: "error", message: `Page returned HTTP ${res.status}` });
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const base = res.url || url;

  /* ── SEO ── */
  const title = $("title").first().text().trim();
  if (!title) findings.push({ rule: "seo-title", severity: "error", message: "Missing <title>" });
  else if (title.length > 60) findings.push({ rule: "seo-title", severity: "warning", message: `Title is ${title.length} characters (aim for ≤ 60)`, detail: title });
  else if (title.length < 15) findings.push({ rule: "seo-title", severity: "info", message: `Title is short (${title.length} characters)`, detail: title });

  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (!desc) findings.push({ rule: "seo-description", severity: "warning", message: "Missing meta description" });
  else if (desc.length > 160) findings.push({ rule: "seo-description", severity: "info", message: `Meta description is ${desc.length} characters (aim for ≤ 160)` });

  const h1s = $("h1");
  if (h1s.length === 0) findings.push({ rule: "seo-h1", severity: "warning", message: "No <h1> on the page" });
  if (h1s.length > 1) findings.push({ rule: "seo-h1", severity: "info", message: `${h1s.length} <h1> elements (use one)` });
  if (!$('meta[name="viewport"]').length) findings.push({ rule: "mobile-viewport", severity: "error", message: "Missing viewport meta tag — page won't scale on phones" });
  if (!$('meta[property="og:title"]').length) findings.push({ rule: "seo-og", severity: "info", message: "No Open Graph tags — link previews will be plain" });
  if (!$('link[rel="canonical"]').length) findings.push({ rule: "seo-canonical", severity: "info", message: "No canonical URL" });

  /* ── Accessibility basics ── */
  if (!$("html").attr("lang")) findings.push({ rule: "a11y-lang", severity: "warning", message: "<html> has no lang attribute" });
  $("img").each((_, el) => {
    if ($(el).attr("alt") === undefined) {
      findings.push({ rule: "a11y-img-alt", severity: "warning", message: "Image without alt text", detail: $(el).attr("src")?.slice(0, 100) });
    }
  });
  $("input, select, textarea").each((_, el) => {
    const $el = $(el);
    const type = ($el.attr("type") ?? "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
    const id = $el.attr("id");
    const labelled = $el.attr("aria-label") || $el.attr("aria-labelledby") || $el.attr("title") || (id && $(`label[for="${id}"]`).length) || $el.closest("label").length;
    if (!labelled) findings.push({ rule: "a11y-label", severity: "error", message: `Form field <${el.tagName}${type ? ` type=${type}` : ""}> has no label`, detail: $el.attr("placeholder") ? `placeholder: “${$el.attr("placeholder")}”` : undefined });
  });
  $("button, a").each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && !$el.attr("aria-label") && !$el.find("img[alt]").length && !$el.attr("title")) {
      findings.push({ rule: "a11y-name", severity: "warning", message: `<${el.tagName}> has no accessible name`, detail: $el.attr("href") ?? undefined });
    }
  });

  /* ── Fonts ── */
  const fontFamilies = new Set<string>();
  const collect = (css: string) => {
    for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
      const first = m[1].split(",")[0].trim().replace(/["']/g, "").replace(/!important/, "").trim();
      if (first && !/^(inherit|initial|unset|var\(.*)$/i.test(first)) fontFamilies.add(first);
    }
  };
  $("style").each((_, el) => collect($(el).text()));
  $("[style]").each((_, el) => collect($(el).attr("style") ?? ""));
  const sheets = $('link[rel="stylesheet"]').map((_, el) => $(el).attr("href")).get().slice(0, 6);
  await Promise.all(
    sheets.map(async (href) => {
      try {
        const r = await fetch(new URL(href, base), { headers: FETCH_HEADERS, signal: AbortSignal.timeout(6000) });
        if (r.ok && (r.headers.get("content-type") ?? "").includes("css")) collect(await r.text());
      } catch { /* ignore */ }
    }),
  );
  if (fontFamilies.size > 3) {
    findings.push({ rule: "fonts-count", severity: "warning", message: `${fontFamilies.size} font families in use (aim for ≤ 3)`, detail: [...fontFamilies].join(", ") });
  }

  /* ── Spelling ── */
  const text = $("body").clone().find("script,style,noscript,svg").remove().end().text();
  const typos = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z]{3,}/g) ?? []) if (MISSPELLINGS[w]) typos.set(w, (typos.get(w) ?? 0) + 1);
  typos.forEach((n, w) => findings.push({ rule: "spelling", severity: "warning", message: `“${w}” → “${MISSPELLINGS[w]}”`, detail: n > 1 ? `${n} occurrences` : undefined }));
  const wordCount = (text.match(/\b\w+\b/g) ?? []).length;

  /* ── Links: every anchor, deduped by URL; the first 60 are checked ── */
  const pageHost = hostKey(base);
  const linkMap = new Map<string, SeoLink & { raw: string }>();
  $("a[href]").each((_, el) => {
    const $a = $(el);
    const h = $a.attr("href")!.trim();
    if (!h || h.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(h)) return;
    let abs: string;
    try {
      const u = new URL(h, base);
      u.hash = "";
      abs = u.toString();
    } catch {
      findings.push({ rule: "link-malformed", severity: "warning", message: "Malformed link", detail: h });
      return;
    }
    if (linkMap.has(abs)) return;
    const rel = ($a.attr("rel") ?? "").toLowerCase();
    const anchor = squash($a.text()) || $a.attr("aria-label")?.trim() || $a.find("img[alt]").attr("alt")?.trim() || $a.attr("title")?.trim() || "";
    linkMap.set(abs, { url: abs, raw: h, anchor: anchor.slice(0, 120), dofollow: !/\b(nofollow|sponsored|ugc)\b/.test(rel) });
  });
  const allLinks = [...linkMap.values()];
  const toCheck = allLinks.slice(0, 60);
  let broken = 0;
  await pool(toCheck, 12, async (l) => {
    l.status = await probe(l.url);
    const state = linkState(l.status);
    if (state === "blocked") {
      findings.push({ rule: "link-unverified", severity: "info", message: `Couldn't verify link (HTTP ${l.status}): the site blocks automated checks`, detail: l.url });
    } else if (state === "broken") {
      broken++;
      findings.push({
        rule: "link-broken",
        severity: "error",
        message: l.status ? `Broken link (HTTP ${l.status})` : "Link unreachable",
        detail: l.url,
        selector: `a[href="${l.raw.replace(/"/g, '\\"')}"]`,
      });
    }
  });
  const strip = ({ raw: _raw, ...l }: SeoLink & { raw: string }): SeoLink => l;
  const isInternal = (u: string) => {
    try {
      return hostKey(u) === pageHost;
    } catch {
      return false;
    }
  };

  /* ── SEO report data ── */
  const finalUrl = new URL(base);
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;
  const robotsHeader = res.headers.get("x-robots-tag");
  const canonicalHref = $('link[rel="canonical"]').attr("href")?.trim();
  const images: SeoImage[] = $("img")
    .map((_, el) => {
      const $i = $(el);
      const src = $i.attr("src") || $i.attr("data-src") || ($i.attr("srcset") ?? "").split(/\s+/)[0] || "";
      const alt = $i.attr("alt");
      return { src: absolute(src, base), alt: alt === undefined ? null : alt.trim() };
    })
    .get()
    .slice(0, 400);
  const metaMap = (attr: "property" | "name", prefix: string) => {
    const out: Record<string, string> = {};
    $(`meta[${attr}^="${prefix}"]`).each((_, el) => {
      const k = $(el).attr(attr)!.trim();
      const v = $(el).attr("content")?.trim();
      if (v && !out[k]) out[k] = /image$|image:url$/.test(k) ? absolute(v, base) : v;
    });
    return out;
  };
  const seo: SeoReport = {
    finalUrl: finalUrl.toString(),
    status: res.status,
    url: {
      length: finalUrl.toString().length,
      pathLength: safeDecode(finalUrl.pathname).length,
      https: finalUrl.protocol === "https:",
      depth: finalUrl.pathname.split("/").filter(Boolean).length,
      params: [...new Set(finalUrl.searchParams.keys())].length,
      hasUppercase: /[A-Z]/.test(finalUrl.pathname),
      hasUnderscore: finalUrl.pathname.includes("_"),
      hasSpaces: /%20|\s/.test(finalUrl.pathname),
    },
    robots: { meta: robotsMeta, header: robotsHeader, indexable: !/noindex|\bnone\b/i.test(`${robotsMeta ?? ""} ${robotsHeader ?? ""}`) && res.ok },
    title: title || null,
    description: desc || null,
    canonical: canonicalHref ? absolute(canonicalHref, base) : null,
    lang: $("html").attr("lang")?.trim() || null,
    wordCount,
    headings: $("h1,h2,h3,h4,h5,h6")
      .map((_, el) => ({ level: Number(el.tagName.slice(1)), text: squash($(el).text()).slice(0, 160) }))
      .get()
      .slice(0, 300),
    links: {
      internal: allLinks.filter((l) => isInternal(l.url)).map(strip).slice(0, 400),
      external: allLinks.filter((l) => !isInternal(l.url)).map(strip).slice(0, 400),
      checked: toCheck.length,
    },
    images,
    schema: readSchema($),
    og: metaMap("property", "og:"),
    twitter: metaMap("name", "twitter:"),
  };

  /* ── Score ── */
  const penalty = findings.reduce((s, f) => s + WEIGHTS[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const order = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    score,
    findings,
    stats: {
      title: title || "(none)",
      linksChecked: toCheck.length,
      brokenLinks: broken,
      fonts: fontFamilies.size,
      images: $("img").length,
      words: wordCount,
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warning").length,
    },
    seo,
  };
}

const squash = (t: string) => t.replace(/\s+/g, " ").trim();
const hostKey = (u: string) => new URL(u).hostname.toLowerCase().replace(/^www\./, "");
function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function absolute(u: string, base: string) {
  if (!u) return "";
  try {
    return new URL(u, base).toString();
  } catch {
    return u;
  }
}

/** Run `fn` over items with at most `size` in flight. */
async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/** JSON-LD blocks (flattening @graph) and top-level microdata items. */
function readSchema($: cheerio.CheerioAPI): SeoSchemaItem[] {
  const out: SeoSchemaItem[] = [];
  const typeOf = (n: Record<string, unknown>) => (Array.isArray(n["@type"]) ? (n["@type"] as string[]).join(", ") : String(n["@type"] ?? "Thing"));
  const flat = (node: Record<string, unknown>, prefix = "", acc: [string, string][] = []) => {
    for (const [k, v] of Object.entries(node)) {
      if (k === "@context" || acc.length >= 30 || v === null || v === undefined) continue;
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v !== "object") acc.push([key, String(v).slice(0, 200)]);
      else if (Array.isArray(v)) {
        if (v.every((x) => typeof x !== "object")) acc.push([key, v.join(", ").slice(0, 200)]);
        else v.slice(0, 3).forEach((x, i) => typeof x === "object" && x && flat(x as Record<string, unknown>, `${key}[${i}]`, acc));
      } else if (!prefix) flat(v as Record<string, unknown>, key, acc);
      else if ((v as Record<string, unknown>)["@id"]) acc.push([`${key}.@id`, String((v as Record<string, unknown>)["@id"])]);
    }
    return acc;
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes: Record<string, unknown>[] = (Array.isArray(data) ? data : [data]).flatMap((d) => (d && Array.isArray(d["@graph"]) ? d["@graph"] : [d]));
      for (const n of nodes) if (n && typeof n === "object") out.push({ type: typeOf(n), source: "json-ld", fields: flat(n) });
    } catch {
      out.push({ type: "Invalid JSON-LD", source: "json-ld", fields: [["error", "This block is not valid JSON, so search engines ignore it"]] });
    }
  });
  $("[itemscope][itemtype]")
    .filter((_, el) => !$(el).parents("[itemscope]").length)
    .each((_, el) => {
      const t = ($(el).attr("itemtype") ?? "").split(/\s+/)[0];
      const fields: [string, string][] = [];
      $(el)
        .find("[itemprop]")
        .slice(0, 20)
        .each((_, p) => {
          fields.push([$(p).attr("itemprop")!, squash($(p).attr("content") ?? $(p).text()).slice(0, 200)]);
        });
      out.push({ type: t.split("/").pop() || t, source: "microdata", fields });
    });
  return out.slice(0, 40);
}

async function probe(href: string): Promise<number> {
  try {
    let r = await fetch(href, { method: "HEAD", headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(6000) });
    if (r.status === 405 || r.status === 403 || r.status === 501) {
      r = await fetch(href, { method: "GET", headers: FETCH_HEADERS, redirect: "follow", signal: AbortSignal.timeout(8000) });
    }
    return r.status;
  } catch {
    return 0;
  }
}
