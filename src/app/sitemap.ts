import type { MetadataRoute } from "next";
import { CHANGELOG, PRODUCTS, SOLUTIONS } from "@/content/marketing";
import { absoluteUrl } from "@/lib/site";

/** Every public marketing page. lastModified follows the latest changelog entry. */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(CHANGELOG[0]?.date ?? Date.now());
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly") => ({
    url: absoluteUrl(path),
    lastModified: updated,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/pricing", 0.9),
    ...PRODUCTS.map((p) => page(`/product/${p.slug}`, 0.8)),
    ...SOLUTIONS.map((s) => page(`/solutions/${s.slug}`, 0.7)),
    page("/integrations", 0.6),
    page("/changelog", 0.5, "weekly"),
    page("/privacy", 0.3, "yearly"),
    page("/terms", 0.3, "yearly"),
  ];
}
