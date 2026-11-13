import "server-only";
import * as cheerio from "cheerio";
import type { AuditFinding } from "@/lib/types";
import { FETCH_HEADERS } from "./fetch-guard";

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

export async function runAudit(url: string): Promise<{ score: number; findings: AuditFinding[]; stats: Record<string, number | string> }> {
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

  /* ── Links ── */
  const hrefs = new Map<string, string>(); // absolute → original attribute value
  $("a[href]").each((_, el) => {
    const h = $(el).attr("href")!.trim();
    if (!h || h.startsWith("#") || /^(mailto|tel|javascript):/i.test(h)) return;
    try {
      const u = new URL(h, base);
      u.hash = "";
      if (!hrefs.has(u.toString())) hrefs.set(u.toString(), h);
    } catch {
      findings.push({ rule: "link-malformed", severity: "warning", message: "Malformed link", detail: h });
    }
  });
  const toCheck = [...hrefs.keys()].slice(0, 40);
  let broken = 0;
  await Promise.all(
    toCheck.map(async (href) => {
      const status = await probe(href);
      if (status === 0 || status >= 400) {
        broken++;
        findings.push({
          rule: "link-broken",
          severity: "error",
          message: status ? `Broken link (HTTP ${status})` : "Link unreachable",
          detail: href,
          selector: `a[href="${hrefs.get(href)!.replace(/"/g, '\\"')}"]`,
        });
      }
    }),
  );

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
  };
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
