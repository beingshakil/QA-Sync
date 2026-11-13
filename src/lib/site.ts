import type { Metadata } from "next";
import { BRAND } from "./brand";

/**
 * Public address of the marketing site, used for canonical URLs, the sitemap, robots.txt,
 * Open Graph images and structured data. Set NEXT_PUBLIC_SITE_URL in production
 * (e.g. https://qasync.app); on Vercel the production domain is picked up automatically.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** The site-wide share image (app/opengraph-image.tsx). Pages with their own image file override it. */
const DEFAULT_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${BRAND.name}: visual feedback that gets fixed` };

/** Per-page SEO: title, description, canonical URL, Open Graph and Twitter card. */
export function pageMetadata({ title, description, path, absoluteTitle = false }: { title: string; description: string; path: string; absoluteTitle?: boolean }): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${BRAND.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: BRAND.name, locale: "en_US", url: path, title: fullTitle, description, images: [DEFAULT_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [DEFAULT_IMAGE.url] },
  };
}
