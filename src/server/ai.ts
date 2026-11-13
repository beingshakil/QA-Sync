import type { ElementInfo, Priority } from "@/lib/types";

/**
 * Phase 1: deterministic "AI" helpers so the UX is real without an API key.
 * Swap path: call the Claude API (small model) for rewrite/title/translate and triage.
 */

export function autoTitle(body: string, element?: ElementInfo | null): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) {
    if (element?.text) return `Issue on “${element.text.slice(0, 40)}”`;
    return element ? `Issue on <${element.tag}>` : "Untitled issue";
  }
  const first = clean.split(/(?<=[.!?])\s/)[0];
  let title = first.length > 72 ? first.slice(0, 69).replace(/\s+\S*$/, "") + "…" : first;
  title = title.replace(/[.!?]+$/, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const URGENT = /\b(crash|broken|down|can'?t (check ?out|pay|log ?in)|blocker|data loss|security)\b/i;
const HIGH = /\b(404|error|fails?|not working|doesn'?t work|overlap|cut off|missing|accessib|contrast|label|wrong)\b/i;
const LOW = /\b(nit|minor|typo|polish|nice to have|maybe|suggest)\b/i;

export function suggestPriority(body: string): Priority {
  if (URGENT.test(body)) return "urgent";
  if (HIGH.test(body)) return "high";
  if (LOW.test(body)) return "low";
  return "medium";
}

/** "@Name" mentions belong in the body, not in an auto-generated title. */
export function stripMentions(text: string, members: string[]): string {
  let t = text;
  for (const m of members) t = t.split(`@${m}`).join("");
  return t.replace(/\s{2,}/g, " ").trim();
}
