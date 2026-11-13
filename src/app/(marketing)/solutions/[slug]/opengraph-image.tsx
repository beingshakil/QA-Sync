import { SOLUTIONS } from "@/content/marketing";
import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "QASync for your team";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  return ogImage({ eyebrow: s ? `For ${s.name.replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase())}` : "Solutions", title: s?.seoTitle ?? "QASync" });
}
