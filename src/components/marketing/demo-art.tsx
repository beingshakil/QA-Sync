import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Product tile for the demo coffee shop ("Northwind"): a stand-up coffee bag drawn in flat
 * colours on a soft card, with the product name and price, the way a real shop page shows it.
 * Replaces the abstract gradient blob, which read as generated art.
 */
export function ProductTile({ className, style, compact }: { className?: string; style?: CSSProperties; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl bg-[#e7edf2]", className)} style={style}>
      <div className="relative flex min-h-0 flex-1 items-end justify-center">
        <svg viewBox="0 0 200 230" className="h-[88%] w-auto" aria-hidden>
          {/* floor shadow */}
          <ellipse cx="100" cy="218" rx="62" ry="7" fill="#10202e" opacity="0.12" />
          {/* bag body */}
          <path d="M52 40 H148 L156 206 Q156 214 148 214 H52 Q44 214 44 206 Z" fill="#10202e" />
          {/* soft side fold */}
          <path d="M132 40 H148 L156 206 Q156 214 148 214 H140 Z" fill="#0b1722" opacity="0.55" />
          {/* crimped top */}
          <rect x="50" y="28" width="100" height="16" rx="2" fill="#0b1722" />
          {[60, 72, 84, 96, 108, 120, 132].map((x) => (
            <rect key={x} x={x} y="31" width="6" height="10" rx="1" fill="#1b3042" />
          ))}
          {/* valve */}
          <circle cx="100" cy="64" r="4" fill="#1b3042" />
          {/* label */}
          <rect x="64" y="88" width="72" height="96" rx="5" fill="#f3f6f9" />
          <text x="100" y="106" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="6.5" fontWeight="700" letterSpacing="1.6" fill="#10202e">
            NORTHWIND
          </text>
          <rect x="88" y="111" width="24" height="1" fill="#10202e" opacity="0.25" />
          <text x="100" y="134" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="17" fontWeight="800" letterSpacing="-0.4" fill="#10202e">
            Guji
          </text>
          <text x="100" y="145" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="5.5" letterSpacing="0.6" fill="#52616e">
            ETHIOPIA · WASHED
          </text>
          <rect x="64" y="156" width="72" height="7" fill="#0E7C86" />
          <text x="100" y="176" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="5.5" letterSpacing="0.6" fill="#52616e">
            LIGHT ROAST · 250 G
          </text>
        </svg>
        <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10202e] shadow-sm">$18</span>
      </div>
      {!compact && (
        <div className="flex items-center justify-between gap-2 whitespace-nowrap border-t border-[#d3dde6] bg-[#eef3f7] px-4 py-3 text-[12px]" style={{ color: "#10202e" }}>
          <span className="truncate font-semibold">Ethiopia Guji</span>
          <span className="shrink-0 text-[#52616e]">250 g</span>
        </div>
      )}
    </div>
  );
}
