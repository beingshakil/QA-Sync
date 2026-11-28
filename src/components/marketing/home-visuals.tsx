import type { ReactNode } from "react";
import Image from "next/image";
import {
  Link2,
  MessageSquarePlus,
  Monitor,
  MousePointer2,
  ScanSearch,
  Smartphone,
  Tablet,
} from "lucide-react";
import { LogoMark } from "@/components/ui";
import { cn } from "@/lib/utils";
import { d } from "./sections";

const PIN = { critical: "#ef4444", medium: "#f97316", verified: "#16a34a" };

/** A pin whose tip sits at (x%, y%) of the screenshot. */
function PinAt({ x, y, color, children }: { x: number; y: number; color: string; children: ReactNode }) {
  return (
    <span
      className="absolute z-10 flex h-6 w-6 items-center justify-center rounded-[12px_12px_12px_3px] text-[11px] font-semibold text-white shadow-2 ring-2 ring-white"
      style={{ left: `${x}%`, top: `${y}%`, background: color, transform: "translate(-3px, -100%)" }}
    >
      {children}
    </span>
  );
}

/* ───────── Hero: the review canvas, fully populated, with the pin → fix → verify story on top ───────── */

export function ProductShot() {
  return (
    <div data-reveal style={d(220)} className="relative">
      <div className="story relative overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_50px_120px_-40px_rgb(0_0_0/0.55)]">
        {/* app toolbar */}
        <div className="flex h-12 items-center gap-3 border-b border-line bg-surface px-3.5">
          <LogoMark className="h-6 w-6" />
          <span className="hidden text-[13px] font-medium text-ink sm:inline">afternow.co</span>
          <div className="ml-1 flex h-7 min-w-0 max-w-[320px] flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-2.5 text-[12px] text-ink-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pass" />
            <span className="truncate">https://afternow.co/work</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ToolGroup className="hidden lg:flex">
              <ToolIcon active>
                <Monitor size={14} />
              </ToolIcon>
              <ToolIcon>
                <Tablet size={14} />
              </ToolIcon>
              <ToolIcon>
                <Smartphone size={14} />
              </ToolIcon>
            </ToolGroup>
            <ToolGroup className="hidden sm:flex">
              <ToolIcon>
                <MousePointer2 size={14} />
              </ToolIcon>
              <ToolIcon active dark>
                <MessageSquarePlus size={14} />
              </ToolIcon>
              <ToolIcon>
                <ScanSearch size={14} />
              </ToolIcon>
            </ToolGroup>
            <span className="flex h-7 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-medium text-white">
              <Link2 size={13} /> Share
            </span>
          </div>
        </div>

        <div className="relative grid md:grid-cols-[1fr_340px]">
          {/* the site under review: a real screenshot, with pins on real problems in it */}
          <div className="relative overflow-hidden bg-white">
            <div className="relative">
              <Image
                src="/demo/afternow-work.webp"
                alt="Example website under review in QASync: an agency's work page with comment pins"
                width={2000}
                height={919}
                quality={90}
                priority
                sizes="(min-width: 1200px) 760px, (min-width: 768px) 60vw, 100vw"
                className="block h-auto w-full"
              />
              {/*
                Every pin sits in empty white space next to what it points at, so none covers
                a logo, title, text or tag. Coordinates are % of the 2000×919 screenshot.
              */}
              {/* 1 · Solvd's description runs as one long line */}
              <PinAt x={77.5} y={76.2} color={PIN.critical}>
                1
              </PinAt>
              {/* 2 · tag text is too small */}
              <PinAt x={28.5} y={76} color={PIN.medium}>
                2
              </PinAt>
              {/* 4 · nav pill vs logo baseline, verified (in the gap between logo and nav) */}
              <PinAt x={60} y={9} color={PIN.verified}>
                ✓
              </PinAt>
              {/* 3 · the story: the Charted card is taller than its neighbours */}
              <div className="story-outline pointer-events-none absolute rounded-lg outline outline-[1.5px] outline-brand" style={{ left: "34.1%", top: "9.9%", width: "31.05%", height: "67.7%" }}>
                <div className="absolute bottom-2 right-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">+146 px</div>
              </div>
              <span
                className="story-pin absolute h-6 w-6 rounded-[12px_12px_12px_3px] text-[11px] font-semibold text-white shadow-2 ring-2 ring-white"
                style={{ left: "53%", top: "92.7%", transform: "translate(-3px, -100%)" }}
              >
                <span className="story-pin-num">3</span>
                <span className="story-pin-check">✓</span>
              </span>
            </div>
          </div>

          {/* comments panel: always populated */}
          <aside className="hidden flex-col border-l border-line bg-surface md:flex">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="text-[13px] font-semibold text-ink">
                Comments <span className="font-normal text-ink-3">· Work</span>
              </div>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-3">4</span>
            </div>
            <div className="px-4 pt-3">
              <div className="flex justify-between text-[11.5px] text-ink-3">
                <span>Page progress</span>
                <span>2 of 4 resolved</span>
              </div>
              <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-surface-2">
                <span className="w-1/4 bg-pass" />
                <span className="w-1/4 bg-[var(--st-fixed)] opacity-80" />
              </div>
              <div className="mt-1.5 flex gap-3 text-[10.5px] text-ink-3">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--st-fixed)]" /> Fixed
                </span>
              </div>
            </div>
            <ul className="space-y-2 p-3 text-[12.5px]">
              <IssueRow n="1" color={PIN.critical} title="Solvd description should wrap like the others" meta="Desktop 1440 · Maya" status="Open" />
              <IssueRow n="2" color={PIN.medium} title="Tag text is too small to read" meta="Desktop · Jordan" status="In review" />
              <li className="rounded-xl border border-brand/40 bg-brand-soft/40 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="story-dot relative mt-0.5 h-5 w-5 shrink-0 rounded-full text-[10px] font-semibold text-white">
                    <span className="story-pin-num">3</span>
                    <span className="story-pin-check">✓</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug text-ink">Charted card is taller than its neighbours</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface-2 px-2 py-1.5 text-[11px] text-ink-2">
                      <span className="font-semibold tabular-nums text-ink">582 px</span>
                      <span className="text-ink-3">vs 436 and 388 px</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-ink-2">
                      <span className="font-medium text-ink">Maya</span> Match the row so the titles line up.
                    </div>
                    <div className="story-reply mt-1 text-[11.5px] text-ink-2">
                      <span className="font-medium text-ink">Arjun</span> One media ratio for all cards. On staging.
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between pl-[30px]">
                  <span className="story-status rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] font-medium">
                    <span className="story-s-open text-[var(--st-open)]">● Open</span>
                    <span className="story-s-fixed text-[var(--st-fixed)]">● Fixed</span>
                    <span className="story-s-verified text-pass">✓ Verified</span>
                  </span>
                  <span data-target="mark-fixed" className="rounded-md bg-ink px-2 py-1 text-[10.5px] font-medium text-paper">
                    Mark fixed
                  </span>
                </div>
              </li>
              <IssueRow n="✓" color={PIN.verified} title="Nav pill sits 2 px above the logo" meta="Desktop · Client" status="Verified" done />
            </ul>
          </aside>

          {/* verified toast */}
          <div className="story-toast absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink shadow-2 md:left-[calc((100%-340px)/2)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-[11px] text-white">✓</span>
            Fix verified on the live page
          </div>

          <MousePointer2 aria-hidden size={20} className="story-cursor hidden fill-[#0b0e15] text-white drop-shadow md:block" />
        </div>
      </div>
    </div>
  );
}

function ToolGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5", className)}>{children}</div>;
}

function ToolIcon({ children, active, dark }: { children: ReactNode; active?: boolean; dark?: boolean }) {
  return (
    <span className={cn("flex h-6 w-7 items-center justify-center rounded-md", active ? (dark ? "bg-ink text-paper" : "bg-brand text-white") : "text-ink-3")}>{children}</span>
  );
}

function IssueRow({ n, color, title, meta, status, done }: { n: string; color: string; title: string; meta: string; status: string; done?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: color }}>
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate font-medium", done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink")}>{title}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-ink-3">
          <span className="truncate">{meta}</span>
          <span className={cn("shrink-0", done && "text-pass")}>{status}</span>
        </div>
      </div>
    </li>
  );
}
