import { ImageResponse } from "next/og";

/** Shared look for every Open Graph / Twitter card image (1200×630). */
export const OG_SIZE = { width: 1200, height: 630 };

export function ogImage({ eyebrow, title, accent }: { eyebrow?: string; title: string; accent?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#05070d",
          backgroundImage:
            "radial-gradient(ellipse 55% 60% at 18% 0%, rgba(91,134,242,0.38), transparent 70%), radial-gradient(ellipse 50% 55% at 88% 6%, rgba(157,108,240,0.32), transparent 70%)",
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#2b5ebe" />
                <stop offset="1" stopColor="#7b2fb0" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#g)" />
            <path d="M19.4 6.95A8 8 0 1 0 22.9 13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M21 4.6l.6 4.4-4.3 1z" fill="#fff" />
            <path d="M16.3 17.6l3.4 3.4 7-7" fill="none" stroke="url(#g)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.3 17.6l3.4 3.4 7-7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            QA<span style={{ color: "#b9a3ff" }}>Sync</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {eyebrow && <div style={{ fontSize: 28, color: "#9dbbff", fontWeight: 600 }}>{eyebrow}</div>}
          {/* Title, then the muted accent on its own line (no indent on wrap) */}
          <div style={{ display: "flex", flexDirection: "column", fontSize: title.length > 40 ? 64 : 76, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 1000 }}>
            <span>{title}</span>
            {accent && <span style={{ color: "#8b95ad" }}>{accent}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 34, fontSize: 25, color: "#aab3c8" }}>
          <span>Pin feedback on live sites</span>
          <span style={{ color: "#3a4560" }}>·</span>
          <span>Inspect specs</span>
          <span style={{ color: "#3a4560" }}>·</span>
          <span>Verify every fix</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
