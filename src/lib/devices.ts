/** Device presets for the review canvas. w/h are CSS pixels; desktop "fit" means "use the pane width". */
export type FrameKey = "desktop" | "tablet" | "mobile";
export interface DevicePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

export const DEVICE_PRESETS: Record<FrameKey, DevicePreset[]> = {
  desktop: [
    { id: "fit", label: "Fit to pane", w: 0, h: 0 },
    { id: "laptop", label: "Laptop", w: 1280, h: 800 },
    { id: "macbook-air", label: "MacBook Air", w: 1440, h: 900 },
    { id: "desktop-hd", label: "Desktop HD", w: 1920, h: 1080 },
  ],
  tablet: [
    { id: "ipad-mini", label: "iPad mini", w: 768, h: 1024 },
    { id: "ipad-air", label: "iPad Air", w: 820, h: 1180 },
    { id: "ipad-pro-11", label: "iPad Pro 11″", w: 834, h: 1194 },
    { id: "ipad-pro-13", label: "iPad Pro 12.9″", w: 1024, h: 1366 },
    { id: "galaxy-tab-s8", label: "Galaxy Tab S8", w: 800, h: 1280 },
  ],
  mobile: [
    { id: "iphone-se", label: "iPhone SE", w: 375, h: 667 },
    { id: "iphone-15", label: "iPhone 15", w: 393, h: 852 },
    { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", w: 430, h: 932 },
    { id: "pixel-8", label: "Pixel 8", w: 412, h: 915 },
    { id: "galaxy-s23", label: "Galaxy S23", w: 360, h: 780 },
  ],
};

export const DEFAULT_SIZES: Record<FrameKey, string> = { desktop: "fit", tablet: "ipad-mini", mobile: "iphone-15" };
export const FALLBACK_W: Record<FrameKey, number> = { desktop: 1440, tablet: 768, mobile: 393 };

export type CustomSizes = Partial<Record<FrameKey, { w: number; h: number }>>;

/** Resolve the chosen preset (or custom size) for a frame. */
export function resolveSize(key: FrameKey, id: string, custom: CustomSizes): DevicePreset {
  if (id === "custom" && custom[key]) return { id: "custom", label: "Custom", w: custom[key]!.w, h: custom[key]!.h };
  return DEVICE_PRESETS[key].find((p) => p.id === id) ?? DEVICE_PRESETS[key].find((p) => p.id === DEFAULT_SIZES[key])!;
}
