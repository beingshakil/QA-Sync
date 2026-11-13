import { PRODUCTS } from "@/content/marketing";
import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "QASync product page";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug);
  return ogImage({ eyebrow: p?.name ?? "Product", title: p?.seoTitle ?? "QASync" });
}
