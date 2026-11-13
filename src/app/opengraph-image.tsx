import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "QASync: visual feedback that gets fixed";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ title: "Visual feedback that", accent: "gets fixed." });
}
