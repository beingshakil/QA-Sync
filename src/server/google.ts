import "server-only";
import { NextResponse } from "next/server";
import { q, q1, run } from "./db";
import { seal, unseal } from "./crypto";
import { getProject, listIssues } from "./repo";
import { reportError } from "./monitor";
import { ISSUE_HEADER, issueRows } from "@/lib/issue-rows";
import { SITE_URL } from "@/lib/site";
import { pageKey, pageLabel } from "@/lib/utils";

/**
 * Google Drive, on the server. Drive permission is asked for during "Sign in with Google" (scope
 * drive.file: QASync sees only files it creates or that the person picks), and the refresh token is
 * kept encrypted in google_grants. Everything QASync makes goes in a "QASync" folder in the
 * person's Drive; each project gets a subfolder, and each page of a project that was sent to Drive
 * gets one sheet, which stays in sync as comments change.
 *
 * The sign-in OAuth client (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) is used; its Cloud project needs the
 * Google Drive and Google Sheets APIs turned on. GOOGLE_*_BASE / *_URL only point tests at a stand-in.
 */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = (process.env.GOOGLE_API_BASE || "https://www.googleapis.com").replace(/\/+$/, "");
const SHEETS_API = (process.env.GOOGLE_SHEETS_BASE || "https://sheets.googleapis.com").replace(/\/+$/, "");
const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || "https://oauth2.googleapis.com/token";
const REVOKE_URL = process.env.GOOGLE_OAUTH_REVOKE_URL || "https://oauth2.googleapis.com/revoke";
const FOLDER = "application/vnd.google-apps.folder";
const SHEET = "application/vnd.google-apps.spreadsheet";

/** Drive works wherever "Sign in with Google" does. */
export const googleSignInConfigured = () => !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export class DriveError extends Error {
  constructor(
    message: string,
    /** "connect": this person must (re)connect Google Drive. "setup": an admin must turn on an API. */
    readonly code: "connect" | "setup" | "google" = "google",
    readonly href?: string,
  ) {
    super(message);
  }
}

/** A Drive failure as JSON the UI can act on: code "connect" (reconnect) or "setup" (an API is off), plus a link. */
export function driveFail(e: unknown) {
  if (e instanceof DriveError) return NextResponse.json({ error: e.message, code: e.code, href: e.href ?? null }, { status: e.code === "connect" ? 409 : e.code === "setup" ? 424 : 502 });
  return NextResponse.json({ error: (e as Error).message || "Google Drive failed" }, { status: 502 });
}

/* ───────── grants ───────── */

type Grant = { userId: string; email: string | null; refresh: string | null; access: string | null; expiresAt: number; scope: string; folderId: string | null; folderUrl: string | null };

async function getGrant(userId: string): Promise<Grant | null> {
  const r = await q1("SELECT * FROM google_grants WHERE user_id = ?", userId);
  if (!r) return null;
  const open = (v: unknown) => {
    try {
      return v ? unseal(v as string) : null;
    } catch {
      return null;
    }
  };
  return {
    userId,
    email: (r.email as string) ?? null,
    refresh: open(r.refresh_token),
    access: open(r.access_token),
    expiresAt: Number(r.expires_at ?? 0),
    scope: (r.scope as string) ?? "",
    folderId: (r.folder_id as string) ?? null,
    folderUrl: (r.folder_url as string) ?? null,
  };
}

/** After "Sign in with Google": keep what Google granted. A missing refresh token never erases a stored one. */
export async function saveGoogleGrant(userId: string, g: { email?: string | null; accessToken?: string | null; refreshToken?: string | null; expiresAt?: number | null; scope?: string | null }) {
  const prev = await getGrant(userId);
  const scope = g.scope ?? prev?.scope ?? "";
  const refresh = g.refreshToken || prev?.refresh || null;
  await run(
    `INSERT INTO google_grants (user_id, email, refresh_token, access_token, expires_at, scope, folder_id, folder_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET email = excluded.email, refresh_token = excluded.refresh_token, access_token = excluded.access_token,
       expires_at = excluded.expires_at, scope = excluded.scope, updated_at = excluded.updated_at`,
    userId,
    g.email ?? prev?.email ?? null,
    refresh ? seal(refresh) : null,
    g.accessToken ? seal(g.accessToken) : null,
    g.expiresAt ?? 0,
    scope,
    prev?.folderId ?? null,
    prev?.folderUrl ?? null,
    new Date().toISOString(),
  );
}

const hasDrive = (g: Grant | null) => !!g?.refresh && g.scope.split(/\s+/).includes(DRIVE_SCOPE);

export async function driveStatus(userId: string) {
  const g = await getGrant(userId);
  return { available: googleSignInConfigured(), connected: hasDrive(g), email: g?.email ?? null, folderUrl: hasDrive(g) ? g!.folderUrl : null };
}

/** A fresh access token (refreshing it when it's about to expire). */
async function accessToken(userId: string, force = false): Promise<string> {
  const g = await getGrant(userId);
  if (!hasDrive(g)) throw new DriveError("Connect Google Drive first.", "connect");
  if (!force && g!.access && g!.expiresAt > Date.now() + 60_000) return g!.access;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.AUTH_GOOGLE_ID ?? "", client_secret: process.env.AUTH_GOOGLE_SECRET ?? "", refresh_token: g!.refresh!, grant_type: "refresh_token" }),
  });
  const d = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; scope?: string; error?: string };
  if (!res.ok || !d.access_token) {
    if (d.error === "invalid_grant") {
      // Revoked in the Google account, or expired: forget it so the person is asked to connect again.
      await run("UPDATE google_grants SET refresh_token = NULL, access_token = NULL WHERE user_id = ?", userId);
      throw new DriveError("Google Drive access was removed. Connect Google Drive again.", "connect");
    }
    throw new DriveError(`Google didn't renew access (${d.error ?? res.status})`);
  }
  await run("UPDATE google_grants SET access_token = ?, expires_at = ?, updated_at = ? WHERE user_id = ?", seal(d.access_token), Date.now() + (d.expires_in ?? 3600) * 1000, new Date().toISOString(), userId);
  return d.access_token;
}

/** Calls a Google API as this person: JSON in and out, one retry with a renewed token on 401. */
async function google<T>(userId: string, url: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<T> {
  const token = await accessToken(userId, retried);
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.json !== undefined ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (res.status === 401 && !retried) return google<T>(userId, url, init, true);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw googleError(res.status, data);
  return data as T;
}

/** Google's errors, in words a person can act on. */
function googleError(status: number, data: unknown): DriveError {
  const e = (data as { error?: { message?: string; status?: string; details?: { reason?: string; metadata?: { service?: string; activationUrl?: string } }[]; errors?: { reason?: string }[] } }).error;
  const reason = e?.details?.find((d) => d.reason)?.reason ?? e?.errors?.[0]?.reason ?? "";
  if (reason === "SERVICE_DISABLED" || reason === "accessNotConfigured" || /has not been used in project|is disabled/i.test(e?.message ?? "")) {
    const meta = e?.details?.find((d) => d.metadata)?.metadata;
    const api = /sheets/i.test(meta?.service ?? e?.message ?? "") ? "Google Sheets API" : "Google Drive API";
    return new DriveError(`The ${api} isn't turned on for QASync yet. An admin turns it on once in Google Cloud.`, "setup", meta?.activationUrl);
  }
  if (status === 403 && /insufficient/i.test(e?.message ?? "")) return new DriveError("QASync doesn't have Drive permission. Connect Google Drive again.", "connect");
  return new DriveError(e?.message || `Google answered HTTP ${status}`);
}

/* ───────── folders ───────── */

type File = { id: string; webViewLink?: string; trashed?: boolean };
const folderLink = (f: File) => f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}`;
const sheetLink = (f: File) => f.webViewLink ?? `https://docs.google.com/spreadsheets/d/${f.id}/edit`;

async function alive(userId: string, id: string | null): Promise<File | null> {
  if (!id) return null;
  try {
    const f = await google<File>(userId, `${DRIVE_API}/drive/v3/files/${encodeURIComponent(id)}?fields=id,webViewLink,trashed`);
    return f.trashed ? null : f;
  } catch (e) {
    if (e instanceof DriveError && e.code !== "google") throw e;
    return null; // deleted, or no longer ours
  }
}

async function createFolder(userId: string, name: string, parent?: string, appProperties?: Record<string, string>): Promise<File> {
  return google<File>(userId, `${DRIVE_API}/drive/v3/files?fields=id,webViewLink`, {
    method: "POST",
    json: { name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}), ...(appProperties ? { appProperties } : {}) },
  });
}

/** The person's "QASync" folder: found again by its id (or its private tag), created when missing. */
export async function qasyncFolder(userId: string): Promise<{ id: string; url: string }> {
  const g = await getGrant(userId);
  const known = await alive(userId, g?.folderId ?? null);
  let f = known;
  if (!f) {
    const query = `mimeType='${FOLDER}' and appProperties has { key='qasync' and value='folder' } and trashed=false`;
    const found = await google<{ files?: File[] }>(userId, `${DRIVE_API}/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1&fields=files(id,webViewLink)`);
    f = found.files?.[0] ?? (await createFolder(userId, "QASync", undefined, { qasync: "folder" }));
  }
  if (!known || g?.folderUrl !== folderLink(f)) await run("UPDATE google_grants SET folder_id = ?, folder_url = ? WHERE user_id = ?", f.id, folderLink(f), userId);
  return { id: f.id, url: folderLink(f) };
}

/* ───────── sheets and docs ───────── */

type Cell = string | number;

async function newSheet(userId: string, name: string, parent: string): Promise<File> {
  // Created through Drive so it lands in the folder (the Sheets API always files it in My Drive).
  return google<File>(userId, `${DRIVE_API}/drive/v3/files?fields=id,webViewLink`, { method: "POST", json: { name: name.slice(0, 200), mimeType: SHEET, parents: [parent] } });
}

/** Header + rows into the first tab: bold, frozen header and sized columns. An existing sheet is cleared first. */
async function writeSheet(userId: string, fileId: string, header: string[], rows: Cell[][], fresh: boolean) {
  const id = encodeURIComponent(fileId);
  const meta = await google<{ sheets?: { properties: { sheetId: number; title?: string } }[] }>(userId, `${SHEETS_API}/v4/spreadsheets/${id}?fields=sheets.properties(sheetId,title)`);
  const first = meta.sheets?.[0]?.properties;
  const sheetId = first?.sheetId ?? 0;
  const tab = fresh ? "Issues" : first?.title || "Sheet1";
  if (fresh) {
    await google(userId, `${SHEETS_API}/v4/spreadsheets/${id}:batchUpdate`, {
      method: "POST",
      json: { requests: [{ updateSheetProperties: { properties: { sheetId, title: tab, gridProperties: { frozenRowCount: 1 } }, fields: "title,gridProperties.frozenRowCount" } }] },
    });
  }
  const range = `'${tab.replace(/'/g, "''")}'`;
  if (!fresh) await google(userId, `${SHEETS_API}/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}:clear`, { method: "POST", json: {} });
  await google(userId, `${SHEETS_API}/v4/spreadsheets/${id}/values/${encodeURIComponent(`${range}!A1`)}?valueInputOption=RAW`, {
    method: "PUT",
    json: { range: `${range}!A1`, majorDimension: "ROWS", values: [header, ...rows] },
  });
  await google(userId, `${SHEETS_API}/v4/spreadsheets/${id}:batchUpdate`, {
    method: "POST",
    json: {
      requests: [
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: "userEnteredFormat.textFormat.bold" } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: header.length } } },
      ],
    },
  });
}

/** A new sheet in the person's QASync folder. Returns its URL. */
export async function exportSheet(userId: string, title: string, header: string[], rows: Cell[][]): Promise<string> {
  const dir = await qasyncFolder(userId);
  const f = await newSheet(userId, title, dir.id);
  await writeSheet(userId, f.id, header, rows, true);
  return sheetLink(f);
}

/** HTML into the QASync folder, converted by Drive into a Google Doc. Returns its URL. */
export async function saveDoc(userId: string, title: string, html: string): Promise<string> {
  const dir = await qasyncFolder(userId);
  const boundary = `qasync${Math.random().toString(36).slice(2)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: title.slice(0, 200), mimeType: "application/vnd.google-apps.document", parents: [dir.id] })}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
  const f = await google<File>(userId, `${DRIVE_API}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return f.webViewLink ?? `https://docs.google.com/document/d/${f.id}/edit`;
}

/** A file the person picked in Google's picker (drive.file allows exactly those). */
export async function downloadPicked(userId: string, fileId: string): Promise<Response> {
  const token = await accessToken(userId);
  const res = await fetch(`${DRIVE_API}/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw googleError(res.status, await res.json().catch(() => ({})));
  return res;
}

/** For Google's file picker in the browser: a short-lived token, plus the picker's own keys. */
export async function pickerToken(userId: string) {
  return accessToken(userId);
}

/* ───────── projects: one sheet per page, kept in sync ───────── */

export type DriveLink = { userId: string; ownerEmail: string | null; folderId: string; folderUrl: string | null };

export async function getDriveLink(projectId: string): Promise<DriveLink | null> {
  const r = await q1("SELECT d.*, g.email FROM drive_links d LEFT JOIN google_grants g ON g.user_id = d.user_id WHERE d.project_id = ?", projectId);
  return r ? { userId: r.user_id as string, ownerEmail: (r.email as string) ?? null, folderId: r.folder_id as string, folderUrl: (r.folder_url as string) ?? null } : null;
}

/** QASync / <project>: the project's folder in its owner's Drive (the person who first sent it there). */
async function projectFolder(projectId: string, userId: string): Promise<DriveLink> {
  const link = await getDriveLink(projectId);
  const owner = link?.userId ?? userId;
  const known = link ? await alive(owner, link.folderId) : null;
  if (known) return link!;
  const project = await getProject(projectId);
  const root = await qasyncFolder(owner);
  const f = await createFolder(owner, project?.name || "Project", root.id, { qasync: "project", qasyncProject: projectId });
  await run(
    "INSERT INTO drive_links (project_id, user_id, folder_id, folder_url, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (project_id) DO UPDATE SET folder_id = excluded.folder_id, folder_url = excluded.folder_url",
    projectId,
    owner,
    f.id,
    folderLink(f),
    new Date().toISOString(),
  );
  return (await getDriveLink(projectId))!;
}

/**
 * Writes every comment on a page into that page's sheet (creating it the first time), in the
 * project owner's Drive. Sending a project to Drive the first time makes the sender its owner.
 */
export async function syncPageSheet(projectId: string, pageUrl: string, userId?: string) {
  const link = await getDriveLink(projectId);
  if (!link && !userId) return null;
  const dir = await projectFolder(projectId, link?.userId ?? userId!);
  const owner = dir.userId;
  const key = pageKey(pageUrl);
  const issues = (await listIssues({ projectId })).filter((i) => pageKey(i.pageUrl) === key).sort((a, b) => a.number - b.number);
  const rows = issueRows(issues, SITE_URL);

  const mapped = await q1("SELECT file_id, url FROM drive_sheets WHERE project_id = ? AND page_key = ?", projectId, key);
  const existing = mapped ? await alive(owner, mapped.file_id as string) : null;
  const project = await getProject(projectId);
  const file = existing ?? (await newSheet(owner, `${pageLabel({ url: pageUrl })} · ${project?.name ?? "Project"}`, dir.folderId));
  await writeSheet(owner, file.id, ISSUE_HEADER, rows, !existing);
  await run(
    "INSERT INTO drive_sheets (project_id, page_key, file_id, url, synced_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (project_id, page_key) DO UPDATE SET file_id = excluded.file_id, url = excluded.url, synced_at = excluded.synced_at",
    projectId,
    key,
    file.id,
    sheetLink(file),
    new Date().toISOString(),
  );
  return { url: sheetLink(file), folderUrl: dir.folderUrl, updated: !!existing, rows: rows.length, ownerEmail: dir.ownerEmail };
}

const queues = new Map<string, Promise<unknown>>();

/**
 * After a comment is added, changed or deleted: refresh its page's sheet, if that page was sent to
 * Drive. One at a time per page, each reading the latest comments, so a burst of edits ends current.
 */
export function autoSyncDrive(projectId: string, pageUrl: string): Promise<void> {
  const key = `${projectId} ${pageKey(pageUrl)}`;
  const job = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (!(await q1("SELECT 1 FROM drive_sheets WHERE project_id = ? AND page_key = ?", projectId, pageKey(pageUrl)))) return;
      await syncPageSheet(projectId, pageUrl);
    })
    .catch((e) => reportError({ kind: "integration", message: `Google Drive: ${(e as Error).message}`, url: pageUrl }));
  queues.set(key, job);
  void job.finally(() => queues.get(key) === job && queues.delete(key));
  return job;
}

/** Disconnect: hand the token back to Google and forget it. Sheets already in Drive stay there. */
export async function disconnectGoogle(userId: string) {
  const g = await getGrant(userId);
  if (g?.refresh) await fetch(`${REVOKE_URL}?token=${encodeURIComponent(g.refresh)}`, { method: "POST" }).catch(() => {});
  await run("DELETE FROM drive_links WHERE user_id = ?", userId);
  await run("UPDATE google_grants SET refresh_token = NULL, access_token = NULL, scope = '' WHERE user_id = ?", userId);
}

/** Projects whose page sheets live in this person's Drive. */
export async function linkedProjectsOf(userId: string): Promise<string[]> {
  return (await q("SELECT project_id FROM drive_links WHERE user_id = ?", userId)).map((r) => r.project_id as string);
}
