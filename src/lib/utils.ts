import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return new URL(u).toString();
}

/**
 * Identity of a page for QA tracking: host + path (no trailing slash / index.html) + query.
 * Relative URLs (pages on this app's own origin) have an empty host.
 */
export function pageKey(u: string): string {
  try {
    const url = new URL(u, "http://x");
    const host = url.host === "x" ? "" : url.host.toLowerCase();
    return host + (url.pathname.replace(/\/(index\.html?)?$/, "") || "") + url.search;
  } catch {
    return u;
  }
}

/**
 * Short, stable name for a page taken from its URL: "/" → "Home", "/services/ui-ux-design" → "Ui-ux-design".
 * Page titles are often identical site-wide ("Brand — Tagline"), so tabs use the URL instead.
 */
export function pageLabel(p: { url: string }): string {
  try {
    const u = new URL(p.url, "http://x");
    const parts = u.pathname.replace(/\/(index\.html?)?$/, "").split("/").filter(Boolean);
    let name = parts.length ? decodeURIComponent(parts[parts.length - 1]).replace(/\.html?$/, "") : "Home";
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return u.search ? `${name} ${u.search}` : name;
  } catch {
    return p.url;
  }
}

export function pagePath(url: string): string {
  try {
    const u = new URL(url, "http://x");
    return u.pathname + u.search;
  } catch {
    return url;
  }
}
