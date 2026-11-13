"use client";

import type { Activity, ApiToken, Attachment, Audit, Comment, Design, Issue, Page, Priority, Project, Status, Workspace } from "./types";

export interface GuestCtx {
  shareToken: string;
  guestName: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  issues: (f: { projectId?: string; pageUrl?: string; status?: string; shareToken?: string } = {}) => call<Issue[]>(`/api/issues${qs(f)}`),
  issue: (id: string, guest?: GuestCtx) =>
    call<{ issue: Issue; comments: Comment[]; activity: Activity[] }>(`/api/issues/${id}${qs({ shareToken: guest?.shareToken })}`),
  createIssue: (body: Record<string, unknown>, guest?: GuestCtx) =>
    call<Issue>("/api/issues", { method: "POST", body: JSON.stringify({ ...body, ...guest }) }),
  updateIssue: (id: string, patch: { status?: Status; priority?: Priority; assignee?: string | null; title?: string; body?: string; retitle?: boolean }, guest?: GuestCtx) =>
    call<Issue>(`/api/issues/${id}`, { method: "PATCH", body: JSON.stringify({ ...patch, ...guest }) }),
  deleteIssue: (id: string, guest?: GuestCtx) => call<{ ok: true }>(`/api/issues/${id}`, { method: "DELETE", body: JSON.stringify({ ...guest }) }),
  updateComment: (id: string, body: string, guest?: GuestCtx) =>
    call<Comment>(`/api/comments/${id}`, { method: "PATCH", body: JSON.stringify({ body, ...guest }) }),
  deleteComment: (id: string, guest?: GuestCtx) => call<{ ok: true }>(`/api/comments/${id}`, { method: "DELETE", body: JSON.stringify({ ...guest }) }),
  comment: (id: string, body: string, guest?: GuestCtx) =>
    call<Comment>(`/api/issues/${id}/comments`, { method: "POST", body: JSON.stringify({ body, ...guest }) }),
  createProject: (body: { name?: string; url: string; figmaUrl?: string }) => call<Project & { existing: boolean; openPage: string | null }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: string, body: { name?: string; baseUrl?: string; figmaUrl?: string | null }) =>
    call<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteProject: (id: string) => call<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
  share: (projectId: string) => call<{ token: string; path: string }>("/api/share", { method: "POST", body: JSON.stringify({ projectId }) }),
  runAudit: (projectId: string, url?: string) => call<Audit>("/api/audits", { method: "POST", body: JSON.stringify({ projectId, url }) }),
  latestAudit: (projectId: string, page: string) => call<Audit | null>(`/api/audits${qs({ projectId, page })}`),
  upload: async (file: Blob, name: string, guest?: GuestCtx): Promise<Attachment> => {
    const fd = new FormData();
    fd.append("file", file, name);
    if (guest) fd.append("shareToken", guest.shareToken);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed");
    return data as Attachment;
  },
  designs: (projectId: string, pageUrl: string, guest?: GuestCtx) =>
    call<Design[]>(`/api/designs${qs(guest ? { shareToken: guest.shareToken, pageUrl } : { projectId, pageUrl })}`),
  addDesign: (body: { projectId: string; pageUrl: string; device: string; uploadId: string }) =>
    call<Design>("/api/designs", { method: "POST", body: JSON.stringify(body) }),
  deleteDesign: (id: string) => call<{ ok: true }>(`/api/designs/${id}`, { method: "DELETE" }),
  pages: (projectId: string, guest?: GuestCtx) => call<Page[]>(`/api/pages${qs(guest ? { shareToken: guest.shareToken } : { projectId })}`),
  addPage: (projectId: string, url: string, opts: { title?: string; visited?: boolean } = {}, guest?: GuestCtx) =>
    call<Page[]>("/api/pages", { method: "POST", body: JSON.stringify({ projectId, url, ...opts, ...guest }) }),
  setPageQa: (pageId: string, qa: "done" | "pending", guest?: GuestCtx) =>
    call<Page[]>(`/api/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ qa, ...guest }) }),
  deletePage: (pageId: string) => call<Page[]>(`/api/pages/${pageId}`, { method: "DELETE" }),
  discoverPages: (projectId: string) =>
    call<{ pages: Page[]; added: number; source: string }>("/api/pages/discover", { method: "POST", body: JSON.stringify({ projectId }) }),
  workspace: () => call<Workspace>("/api/workspace"),
  apiTokens: () => call<ApiToken[]>("/api/tokens"),
  createApiToken: (name: string) => call<{ token: string; record: ApiToken }>("/api/tokens", { method: "POST", body: JSON.stringify({ name }) }),
  revokeApiToken: (id: string) => call<{ ok: true }>(`/api/tokens/${id}`, { method: "DELETE" }),
  updateWorkspace: (patch: Partial<Workspace>) => call<Workspace>("/api/workspace", { method: "PATCH", body: JSON.stringify(patch) }),
};
