import type { SeoReport } from "./types";

/**
 * SEO pass/fail rules for an audited page. Pure: shared by the report UI (and safe for MCP later).
 * Each check is green (pass) or red (fail); failing checks carry one concrete fix.
 */
export type SeoTab = "overview" | "headings" | "links" | "images" | "schema" | "social";
export type SeoCheckId = "title" | "description" | "headings" | "images" | "internal" | "external" | "url" | "indexable" | "canonical" | "schema" | "og" | "lang";

export interface SeoCheck {
  id: SeoCheckId;
  group: "onpage" | "technical";
  label: string;
  pass: boolean;
  /** Short value for the pill, e.g. "40 characters". */
  badge: string;
  /** What the page actually has, shown under the label. */
  value: string | null;
  /** One-line fix, only on failing checks. */
  fix?: string;
  /** Detail tab that explains this check. */
  tab?: SeoTab;
  /** Small facts shown on the row, e.g. "1 H1 · 14 H2 · 20 H3". */
  meta?: string;
}

export const TITLE_RANGE = [30, 60] as const;
export const DESC_RANGE = [70, 160] as const;
export const URL_MAX = 75;
export const OG_REQUIRED = ["og:title", "og:description", "og:image", "og:url"] as const;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const chars = (n: number) => plural(n, "character");

export function headingCounts(r: SeoReport) {
  const c = [0, 0, 0, 0, 0, 0];
  for (const h of r.headings) c[h.level - 1]++;
  return c;
}

/** First place a heading level is skipped, e.g. H2 → H4. */
export function headingSkip(r: SeoReport): { from: number; to: number; text: string } | null {
  let prev = 0;
  for (const h of r.headings) {
    if (prev && h.level > prev + 1) return { from: prev, to: h.level, text: h.text };
    prev = h.level;
  }
  return null;
}

/**
 * ok: 2xx/3xx · broken: 404, 410, 5xx or unreachable · blocked: the site refused an automated
 * check (403, 429, LinkedIn's 999…), so the link probably works but couldn't be verified.
 */
export type LinkState = "ok" | "broken" | "blocked" | "unchecked";
export function linkState(status?: number): LinkState {
  if (status === undefined) return "unchecked";
  if (status === 999) return "blocked";
  if (status > 0 && status < 400) return "ok";
  if (status === 0 || status === 404 || status === 410 || status >= 500) return "broken";
  return "blocked";
}
export const isBroken = (status?: number) => linkState(status) === "broken";

export function seoChecks(r: SeoReport): SeoCheck[] {
  const out: SeoCheck[] = [];

  /* ── On-page ── */
  const tLen = r.title?.length ?? 0;
  out.push({
    id: "title",
    group: "onpage",
    label: "Meta title",
    value: r.title,
    ...(!r.title
      ? { pass: false, badge: "Missing", fix: "Add a <title> of 30–60 characters that names the page and the brand." }
      : tLen > TITLE_RANGE[1]
        ? { pass: false, badge: chars(tLen), fix: `Too long: Google cuts titles at about 60 characters. Trim ${tLen - TITLE_RANGE[1]} characters.` }
        : tLen < TITLE_RANGE[0]
          ? { pass: false, badge: chars(tLen), fix: `Too short: use ${TITLE_RANGE[0]}–${TITLE_RANGE[1]} characters with the page's main keyword.` }
          : { pass: true, badge: chars(tLen) }),
  });

  const dLen = r.description?.length ?? 0;
  out.push({
    id: "description",
    group: "onpage",
    label: "Meta description",
    value: r.description,
    ...(!r.description
      ? { pass: false, badge: "Missing", fix: "Add a meta description of 70–160 characters; without one, Google picks random page text." }
      : dLen > DESC_RANGE[1]
        ? { pass: false, badge: chars(dLen), fix: `Too long: it will be cut off in results. Trim ${dLen - DESC_RANGE[1]} characters.` }
        : dLen < DESC_RANGE[0]
          ? { pass: false, badge: chars(dLen), fix: `Too short: expand to ${DESC_RANGE[0]}–${DESC_RANGE[1]} characters that summarise the page.` }
          : { pass: true, badge: chars(dLen) }),
  });

  const hc = headingCounts(r);
  const skip = headingSkip(r);
  const h1 = hc[0];
  out.push({
    id: "headings",
    group: "onpage",
    label: "Heading structure",
    tab: "headings",
    value: r.headings.find((h) => h.level === 1)?.text ?? null,
    meta: hc.map((n, i) => (n ? `${n} H${i + 1}` : "")).filter(Boolean).join(" · ") || "No headings",
    ...(h1 === 0
      ? { pass: false, badge: "No H1", fix: "Add exactly one H1 that states what the page is about." }
      : h1 > 1
        ? { pass: false, badge: `${h1} H1s`, fix: `Use a single H1; turn the other ${h1 - 1} into H2s.` }
        : skip
          ? { pass: false, badge: `H${skip.from} → H${skip.to}`, fix: `Heading levels skip from H${skip.from} to H${skip.to} at “${skip.text.slice(0, 48)}”. Don't skip levels.` }
          : { pass: true, badge: "1 H1, in order" }),
  });

  const noAttr = r.images.filter((i) => i.alt === null).length;
  const empty = r.images.filter((i) => i.alt === "").length;
  const without = noAttr + empty;
  out.push({
    id: "images",
    group: "onpage",
    label: "Image alt text",
    tab: "images",
    value: r.images.length ? `${plural(r.images.length, "image")} · ${r.images.length - without} with alt text` : "No images on this page",
    meta: without ? `${noAttr} without an alt attribute · ${empty} with empty alt=""` : undefined,
    ...(without
      ? {
          pass: false,
          badge: `${without} without alt`,
          fix: noAttr
            ? `Add alt text to ${plural(noAttr, "image")} that have none${empty ? `, and check the ${empty} with empty alt` : ""}: describe what each image shows.`
            : `${plural(empty, "image")} use empty alt="". That's right for pure icons and dividers; describe any that carry meaning.`,
        }
      : { pass: true, badge: r.images.length ? "All have alt" : "No images" }),
  });

  const unverified = (ls: SeoReport["links"]["internal"]) => ls.filter((l) => linkState(l.status) === "blocked").length;
  const brokenIn = r.links.internal.filter((l) => isBroken(l.status)).length;
  const blockedIn = unverified(r.links.internal);
  out.push({
    id: "internal",
    group: "onpage",
    label: "Internal links",
    tab: "links",
    value: `${plural(r.links.internal.length, "unique link")} to this site${blockedIn ? ` · ${blockedIn} couldn't be verified` : ""}`,
    ...(r.links.internal.length === 0
      ? { pass: false, badge: "None", fix: "Link to related pages on your site so search engines can crawl and rank them." }
      : brokenIn
        ? { pass: false, badge: `${brokenIn} broken`, fix: `Fix or remove ${plural(brokenIn, "broken internal link")}; they waste crawl budget and frustrate visitors.` }
        : { pass: true, badge: "0 broken" }),
  });

  const brokenEx = r.links.external.filter((l) => isBroken(l.status)).length;
  const blockedEx = unverified(r.links.external);
  const nofollowEx = r.links.external.filter((l) => !l.dofollow).length;
  out.push({
    id: "external",
    group: "onpage",
    label: "External links",
    tab: "links",
    value: r.links.external.length ? `${plural(r.links.external.length, "unique link")} · ${nofollowEx} nofollow${blockedEx ? ` · ${blockedEx} couldn't be verified` : ""}` : "No outbound links",
    ...(brokenEx
      ? { pass: false, badge: `${brokenEx} broken`, fix: `Update or remove ${plural(brokenEx, "broken outbound link")}.` }
      : { pass: true, badge: r.links.external.length ? "0 broken" : "None" }),
  });

  /* ── Technical ── */
  const u = r.url;
  const urlProblems = [
    !u.https && "not HTTPS",
    u.length > URL_MAX && `${u.length} characters long (keep under ${URL_MAX})`,
    u.hasUppercase && "has uppercase letters",
    u.hasUnderscore && "uses underscores (use hyphens)",
    u.hasSpaces && "contains spaces",
    u.params > 2 && `${u.params} query parameters`,
    u.depth > 4 && `${u.depth} folders deep`,
  ].filter(Boolean) as string[];
  out.push({
    id: "url",
    group: "technical",
    label: "URL structure",
    value: r.finalUrl,
    meta: `${chars(u.length)} · ${u.https ? "HTTPS" : "HTTP"} · depth ${u.depth}`,
    ...(urlProblems.length
      ? { pass: false, badge: plural(urlProblems.length, "issue"), fix: `URL ${urlProblems.join(", ")}.` }
      : { pass: true, badge: "Clean" }),
  });

  const robotsText = [r.robots.meta && `meta: ${r.robots.meta}`, r.robots.header && `header: ${r.robots.header}`].filter(Boolean).join(" · ");
  out.push({
    id: "indexable",
    group: "technical",
    label: "Indexability",
    value: robotsText || `HTTP ${r.status} · no robots directives`,
    ...(r.status >= 400
      ? { pass: false, badge: `HTTP ${r.status}`, fix: "The page returns an error status, so it can't be indexed." }
      : !r.robots.indexable
        ? { pass: false, badge: "noindex", fix: "This page tells search engines not to index it. Remove noindex if it should rank." }
        : { pass: true, badge: "Indexable" }),
  });

  const selfCanonical = r.canonical ? sameUrl(r.canonical, r.finalUrl) : false;
  out.push({
    id: "canonical",
    group: "technical",
    label: "Canonical tag",
    value: r.canonical,
    ...(!r.canonical
      ? { pass: false, badge: "Missing", fix: "Add <link rel=\"canonical\"> pointing to this URL to prevent duplicate-content issues." }
      : { pass: true, badge: selfCanonical ? "Self-referencing" : "Points elsewhere", meta: selfCanonical ? undefined : "Search engines will rank the canonical URL instead of this one." }),
  });

  const types = [...new Set(r.schema.filter((s) => s.type !== "Invalid JSON-LD").map((s) => s.type))];
  const invalid = r.schema.some((s) => s.type === "Invalid JSON-LD");
  out.push({
    id: "schema",
    group: "technical",
    label: "Schema markup",
    tab: "schema",
    value: types.length ? types.join(", ") : null,
    ...(invalid
      ? { pass: false, badge: "Invalid JSON-LD", fix: "One JSON-LD block doesn't parse; search engines ignore it. Validate it with Google's Rich Results Test." }
      : !types.length
        ? { pass: false, badge: "Missing", fix: "Add JSON-LD structured data (e.g. Organization, WebSite, BreadcrumbList) to qualify for rich results." }
        : { pass: true, badge: plural(types.length, "type") }),
  });

  const ogMissing = OG_REQUIRED.filter((k) => !r.og[k]);
  out.push({
    id: "og",
    group: "technical",
    label: "Open Graph tags",
    tab: "social",
    value: r.og["og:title"] ?? null,
    meta: `${OG_REQUIRED.length - ogMissing.length}/${OG_REQUIRED.length} required tags${r.twitter["twitter:card"] ? ` · Twitter card: ${r.twitter["twitter:card"]}` : ""}`,
    ...(ogMissing.length
      ? { pass: false, badge: `${ogMissing.length} missing`, fix: `Add ${ogMissing.join(", ")} so shared links show a proper preview card.` }
      : { pass: true, badge: "Complete" }),
  });

  out.push({
    id: "lang",
    group: "technical",
    label: "Language",
    value: r.lang,
    ...(r.lang ? { pass: true, badge: r.lang } : { pass: false, badge: "Missing", fix: "Add a lang attribute to <html> (e.g. lang=\"en\") so search engines serve the right audience." }),
  });

  return out;
}

function sameUrl(a: string, b: string) {
  const norm = (s: string) => {
    try {
      const u = new URL(s);
      u.hash = "";
      return `${u.protocol}//${u.host.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
    } catch {
      return s;
    }
  };
  return norm(a) === norm(b);
}
