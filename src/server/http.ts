import "server-only";
import { NextResponse } from "next/server";
import { getIssue, getShare, getWorkspace } from "./repo";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/**
 * Phase 1 auth: workspace members are implicit (single local user).
 * Guests act through a share token scoped to one project.
 * Swap path: session from WorkOS/Clerk + role checks.
 */
export type Actor = { kind: "member"; name: string } | { kind: "guest"; name: string; projectId: string };

export function actorFrom(body: { shareToken?: string; guestName?: string } | null): Actor | { error: string } {
  if (body?.shareToken) {
    const share = getShare(body.shareToken);
    if (!share) return { error: "Invalid share link" };
    const name = (body.guestName ?? "").trim().slice(0, 60) || "Guest";
    return { kind: "guest", name, projectId: share.projectId };
  }
  return { kind: "member", name: getWorkspace().userName };
}

export function isMember(name: string | null | undefined): name is string {
  return !!name && getWorkspace().members.includes(name);
}

export function guestCanTouchIssue(actor: Actor, issueId: string): boolean {
  if (actor.kind === "member") return true;
  const issue = getIssue(issueId);
  return !!issue && issue.projectId === actor.projectId;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Edit/delete rules.
 * Issues: members can edit or delete any; guests only the ones they reported (same share link + name).
 * Replies: members can edit their own and delete any; guests can edit or delete only their own.
 */
export function canEditIssue(actor: Actor, issue: { projectId: string; reporterType: string; reporterName: string }): boolean {
  if (actor.kind === "member") return true;
  return issue.projectId === actor.projectId && issue.reporterType === "guest" && issue.reporterName === actor.name;
}

export function canChangeComment(actor: Actor, c: { author: string; authorType: string }, action: "edit" | "delete"): boolean {
  if (actor.kind === "member") return action === "delete" || (c.authorType === "member" && c.author === actor.name);
  return c.authorType === "guest" && c.author === actor.name;
}
