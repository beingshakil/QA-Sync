import "server-only";
import { NextResponse } from "next/server";
import { getIssue, getProject, getShare, isMemberName } from "./repo";
import { getCtx, type Ctx } from "./session";
import type { Issue, Project } from "@/lib/types";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/**
 * Who is making the request:
 * - a guest, through a share token scoped to one project, or
 * - a signed-in member of a workspace (Google sign-in), acting in their active workspace.
 */
export type Actor =
  | { kind: "member"; name: string; userId: string; workspaceId: string; role: Ctx["role"] }
  | { kind: "guest"; name: string; projectId: string };

export async function actorFrom(body: { shareToken?: string; guestName?: string } | null): Promise<Actor | { error: string; status: number }> {
  if (body?.shareToken) {
    const share = await getShare(body.shareToken);
    if (!share) return { error: "Invalid share link", status: 403 };
    const name = (body.guestName ?? "").trim().slice(0, 60) || "Guest";
    return { kind: "guest", name, projectId: share.projectId };
  }
  const ctx = await getCtx();
  if (!ctx) return { error: "Sign in to continue", status: 401 };
  return { kind: "member", name: ctx.userName, userId: ctx.userId, workspaceId: ctx.workspaceId, role: ctx.role };
}

/** Member-only routes: the signed-in context, or a 401 response to return as is. */
export async function member(): Promise<Ctx | NextResponse> {
  const ctx = await getCtx();
  return ctx ?? fail("Sign in to continue", 401);
}

/** A project the actor may see: in their workspace (members) or the one their link covers (guests). */
export async function projectFor(actor: Actor | Ctx, projectId: string | null | undefined): Promise<Project | null> {
  if (!projectId) return null;
  const p = await getProject(projectId);
  if (!p) return null;
  if ("kind" in actor && actor.kind === "guest") return p.id === actor.projectId ? p : null;
  return p.workspaceId === actor.workspaceId ? p : null;
}

/** An issue the actor may see, by the same rule. */
export async function issueFor(actor: Actor, issueId: string): Promise<(Issue & { workspaceId: string }) | null> {
  const issue = await getIssue(issueId);
  if (!issue) return null;
  if (actor.kind === "guest") return issue.projectId === actor.projectId ? issue : null;
  return issue.workspaceId === actor.workspaceId ? issue : null;
}

export async function isMember(workspaceId: string, name: string | null | undefined): Promise<boolean> {
  return isMemberName(workspaceId, name);
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
