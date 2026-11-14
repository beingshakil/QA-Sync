/** Plan limits and features (must match the pricing page). Infinity = no limit. */
export type PlanId = "free" | "pro";

/** Things a workspace has a number of. */
export type Metered = "projects" | "comments" | "audits" | "members";

/** Tools only Pro workspaces get. */
export type Feature = "inspect" | "freeze" | "devices" | "overlay" | "pageQa" | "guests" | "agents";

export const PLAN_LIMITS: Record<PlanId, Record<Metered, number> & { label: string }> = {
  free: { projects: 2, comments: 50, audits: 3, members: 2, label: "Free" },
  pro: { projects: Infinity, comments: Infinity, audits: Infinity, members: Infinity, label: "Pro" },
};

export const METERED_LABEL: Record<Metered, { one: string; many: string }> = {
  projects: { one: "project", many: "projects" },
  comments: { one: "comment", many: "comments" },
  audits: { one: "page audit", many: "page audits" },
  members: { one: "team member", many: "team members" },
};

export const FEATURE_LABEL: Record<Feature, string> = {
  inspect: "Inspect, measure and contrast",
  freeze: "Freeze hover",
  devices: "Custom device sizes, split view and sync scroll",
  overlay: "Design overlay and compare",
  pageQa: "Page-wise QA tracking",
  guests: "Client guest comments",
  agents: "AI agents over MCP",
};

export const hasFeature = (plan: PlanId, _f: Feature) => plan === "pro";

/** From this share of a limit on, people are warned before they run out. */
export const NEAR_LIMIT = 0.8;

export type UsageState = "ok" | "near" | "full";
export function usageState(used: number, limit: number): UsageState {
  if (!Number.isFinite(limit)) return "ok";
  if (used >= limit) return "full";
  // Only warn where there's room for a warning to mean something (not "1 of 2 projects").
  return limit >= 10 && used >= Math.ceil(limit * NEAR_LIMIT) ? "near" : "ok";
}

export interface WorkspacePlan {
  /** What the workspace is entitled to right now (an expired Pro counts as Free). */
  plan: PlanId;
  /** The stored plan, before expiry is applied. */
  stored: PlanId;
  expiresAt: string | null;
  expired: boolean;
  /** Owned by a site admin (QASYNC_ADMIN_EMAILS): always Pro, with no end date. */
  admin?: boolean;
}

/** A site admin's workspaces have every feature, permanently. */
export const ADMIN_PLAN: WorkspacePlan = { plan: "pro", stored: "pro", expiresAt: null, expired: false, admin: true };

export function effectivePlan(stored: string | null | undefined, expiresAt: string | null | undefined, now = Date.now()): WorkspacePlan {
  const s: PlanId = stored === "pro" ? "pro" : "free";
  const expired = s === "pro" && !!expiresAt && new Date(expiresAt).getTime() <= now;
  return { plan: expired ? "free" : s, stored: s, expiresAt: expiresAt ?? null, expired };
}

export type Usage = Record<Metered, number>;

/** What the review canvas needs to know about the workspace's plan. limit null = unlimited. */
export interface PlanAccess {
  pro: boolean;
  comments: { used: number; limit: number | null };
}
