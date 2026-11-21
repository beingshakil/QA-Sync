import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createWorkspace, getUser, getWorkspace, listUserWorkspaces } from "./repo";
import { verifyExtensionToken } from "./tokens";
import type { Member, Workspace } from "@/lib/types";

/** Cookie that remembers which workspace is active when a user belongs to several. */
export const WS_COOKIE = "qasync_ws";

export interface Ctx {
  userId: string;
  userName: string;
  email: string;
  image: string | null;
  workspaceId: string;
  workspaceName: string;
  role: Member["role"];
  workspaces: { id: string; name: string; role: Member["role"] }[];
}

/**
 * The signed-in user and their active workspace, or null when signed out. Cached per request.
 * Without a session cookie, a browser-extension token (`Authorization: Bearer qasx_…`) signs the
 * request in as the person who connected the extension, in the workspace it was connected to.
 */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const session = await auth();
  let uid = (session?.user as { id?: string } | undefined)?.id;
  let tokenWorkspace: string | null = null;
  if (!uid) {
    const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(qasx_\S+)$/i)?.[1];
    const t = bearer ? await verifyExtensionToken(bearer) : null;
    if (!t) return null;
    uid = t.userId;
    tokenWorkspace = t.workspaceId;
  }
  const user = await getUser(uid);
  if (!user) return null;
  let workspaces = await listUserWorkspaces(uid);
  if (!workspaces.length) {
    // Removed from every workspace they were in: give them their own again.
    await createWorkspace(user, `${user.name.split(" ")[0]}'s workspace`);
    workspaces = await listUserWorkspaces(uid);
  }
  if (tokenWorkspace && !workspaces.some((w) => w.id === tokenWorkspace)) return null; // no longer a member there
  const wanted = tokenWorkspace ?? (await cookies()).get(WS_COOKIE)?.value;
  const ws = workspaces.find((w) => w.id === wanted) ?? workspaces[0];
  return {
    userId: user.id,
    userName: user.name,
    email: user.email,
    image: user.image,
    workspaceId: ws.id,
    workspaceName: ws.name,
    role: ws.role,
    workspaces,
  };
});

/** For pages: the context, or a redirect to the sign-in page. */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

/** The active workspace with its members, for the UI. */
export const getCurrentWorkspace = cache(async (): Promise<Workspace> => {
  const ctx = await requireCtx();
  const ws = await getWorkspace(ctx.workspaceId, ctx.userId);
  if (!ws) redirect("/login");
  return ws;
});
