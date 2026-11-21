/**
 * Google Drive, Sheets and Docs from the browser, with the narrowest Drive scope (drive.file):
 * QASync only ever sees files the user picks in Google's own picker, or files QASync creates for
 * them. The access token stays in this page's memory for its lifetime (about an hour); nothing is
 * stored on QASync's servers.
 *
 * Everything QASync creates lands in one "QASync" folder in the user's Drive, created on first use
 * (or from Settings → Google Drive) and found again later by a private tag, never duplicated.
 *
 * Config (all public by design): an OAuth web client ID, plus an API key and the project number
 * (app ID) for the file picker. It comes from NEXT_PUBLIC_GOOGLE_* at build time, or from the keys
 * an admin pasted in the setup popup: the app layout passes those in (setGoogleConfig).
 */

export type GoogleConfig = { clientId: string; apiKey: string; appId: string };
const fromEnv = (): GoogleConfig => ({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "",
  appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "",
});
let cfg: GoogleConfig = fromEnv();
const SCOPE = "https://www.googleapis.com/auth/drive.file";

/** The same for every user (set by the app layout, and right after an admin saves new keys). */
export function setGoogleConfig(c: GoogleConfig | null) {
  cfg = c?.clientId ? c : fromEnv();
}

/** Exports (Sheets, Docs) need only the client ID; picking a file also needs the API key and app ID. */
export const googleExportReady = () => !!cfg.clientId;
export const googlePickerReady = () => !!(cfg.clientId && cfg.apiKey && cfg.appId);

type TokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
type PickerDoc = { id: string; name: string; mimeType: string };
type GoogleNs = {
  accounts: {
    oauth2: {
      initTokenClient(c: {
        client_id: string;
        scope: string;
        login_hint?: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type?: string; message?: string }) => void;
      }): { requestAccessToken(o?: { prompt?: string }): void };
      revoke(token: string, done?: () => void): void;
    };
  };
  picker: {
    DocsView: new (viewId?: unknown) => { setMimeTypes(m: string): unknown; setIncludeFolders(b: boolean): unknown };
    ViewId: { DOCS_IMAGES: unknown };
    PickerBuilder: new () => PickerBuilder;
    Action: { PICKED: string; CANCEL: string };
  };
};
type PickerBuilder = {
  setAppId(id: string): PickerBuilder;
  setOAuthToken(t: string): PickerBuilder;
  setDeveloperKey(k: string): PickerBuilder;
  addView(v: unknown): PickerBuilder;
  setTitle(t: string): PickerBuilder;
  setCallback(cb: (d: { action: string; docs?: PickerDoc[] }) => void): PickerBuilder;
  build(): { setVisible(v: boolean): void };
};
const w = () => window as unknown as { google?: GoogleNs; gapi?: { load(lib: string, cb: () => void): void } };

const loading = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = loading.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading.delete(src);
        reject(new Error("Couldn't load Google's sign-in. Check your connection or ad blocker."));
      };
      document.head.appendChild(s);
    });
    loading.set(src, p);
  }
  return p;
}

/** Warm up Google's scripts so a click opens the consent popup straight away (popup blockers care). */
export function preloadGoogle(picker = false) {
  if (!googleExportReady()) return;
  loadScript("https://accounts.google.com/gsi/client").catch(() => {});
  if (picker && googlePickerReady()) loadScript("https://apis.google.com/js/api.js").catch(() => {});
}

let token: { value: string; exp: number } | null = null;

/** The email the person signed in to QASync with: Google offers that account first. */
let accountHint = "";
export function setGoogleAccountHint(email: string) {
  accountHint = email;
}

/** A drive.file access token: asks once (Google's popup), then reuses it until it expires. */
export async function googleToken(): Promise<string> {
  if (!cfg.clientId) throw new Error("Google Drive isn't set up yet");
  if (token && Date.now() < token.exp - 60_000) return token.value;
  await loadScript("https://accounts.google.com/gsi/client");
  return new Promise((resolve, reject) => {
    const client = w().google!.accounts.oauth2.initTokenClient({
      client_id: cfg.clientId,
      scope: SCOPE,
      ...(accountHint ? { login_hint: accountHint } : {}),
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || "Google didn't grant access"));
        token = { value: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "The Google window was closed" : e.message || "Google sign-in failed")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function gjson<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const t = await googleToken();
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${t}`, ...(init.json !== undefined ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) token = null;
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `Google answered HTTP ${res.status}`);
  return data as T;
}

const DRIVE = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
export const DRIVE_FOLDER_NAME = "QASync";

/** What this browser remembers about the person's Drive: which account, and where the QASync folder is. */
export type DriveLink = { email: string; folderId: string; folderUrl: string };
const storeKey = () => `qasync-drive:${accountHint || "default"}`;
export function savedDriveLink(): DriveLink | null {
  try {
    return JSON.parse(localStorage.getItem(storeKey()) ?? "null");
  } catch {
    return null;
  }
}
function saveDriveLink(link: DriveLink | null) {
  try {
    if (link) localStorage.setItem(storeKey(), JSON.stringify(link));
    else localStorage.removeItem(storeKey());
  } catch {}
  window.dispatchEvent(new Event("qasync-drive"));
}

let folder: { id: string; url: string } | null = null; // checked during this page's lifetime
let folderPending: Promise<{ id: string; url: string }> | null = null;

/**
 * The QASync folder in the person's Drive, created the first time it's needed. It carries a private
 * app tag, so it's found again even if renamed, and drive.file means QASync sees only this folder
 * and what it put there.
 */
export function qasyncFolder(): Promise<{ id: string; url: string }> {
  if (folder) return Promise.resolve(folder);
  folderPending ??= (async () => {
    const saved = savedDriveLink();
    if (saved?.folderId) {
      // Still there and not in the bin? (It may also belong to another Google account: then this 404s.)
      const f = await gjson<{ id: string; webViewLink?: string; trashed?: boolean }>(`${DRIVE}/files/${encodeURIComponent(saved.folderId)}?fields=id,webViewLink,trashed`).catch(() => null);
      if (f && !f.trashed) return (folder = { id: f.id, url: f.webViewLink ?? saved.folderUrl });
    }
    const q = `mimeType='${FOLDER_MIME}' and appProperties has { key='qasync' and value='folder' } and trashed=false`;
    const found = await gjson<{ files: { id: string; webViewLink?: string }[] }>(`${DRIVE}/files?q=${encodeURIComponent(q)}&spaces=drive&pageSize=1&fields=files(id,webViewLink)`);
    const f =
      found.files?.[0] ??
      (await gjson<{ id: string; webViewLink?: string }>(`${DRIVE}/files?fields=id,webViewLink`, {
        method: "POST",
        json: { name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { qasync: "folder" }, description: "Sheets and docs exported from QASync." },
      }));
    const url = f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}`;
    const about = await gjson<{ user?: { emailAddress?: string } }>(`${DRIVE}/about?fields=user(emailAddress)`).catch(() => null);
    saveDriveLink({ email: about?.user?.emailAddress ?? saved?.email ?? "", folderId: f.id, folderUrl: url });
    return (folder = { id: f.id, url });
  })().finally(() => (folderPending = null));
  return folderPending;
}

/** Settings → Connect Google Drive: asks Google once, then creates (or finds) the QASync folder. */
export async function connectGoogleDrive(): Promise<DriveLink> {
  folder = null; // re-check: the person may have picked another account
  await qasyncFolder();
  return savedDriveLink()!;
}

/** Forgets the folder in this browser and hands the access token back to Google. */
export function disconnectGoogleDrive() {
  const t = token?.value;
  token = null;
  folder = null;
  saveDriveLink(null);
  if (t) w().google?.accounts?.oauth2?.revoke?.(t);
}

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
type Cell = string | number;

/** Drive query strings quote values with single quotes (escaping \ and '). */
const lit = (s: string) => `'${s.replace(/[\\']/g, (c) => `\\${c}`)}'`;

/**
 * Fills a sheet's first tab with a header and rows: bold, frozen header, sized columns. A sheet
 * QASync just created also gets its tab named "Issues"; an existing one is cleared first, so
 * sending again replaces the rows instead of stacking duplicates.
 */
async function writeSheet(fileId: string, header: string[], rows: Cell[][], fresh: boolean) {
  const id = encodeURIComponent(fileId);
  const meta = await gjson<{ sheets?: { properties: { sheetId: number; title?: string } }[] }>(`${SHEETS}/${id}?fields=sheets.properties(sheetId,title)`);
  const first = meta.sheets?.[0]?.properties;
  const sheetId = first?.sheetId ?? 0;
  const tab = fresh ? "Issues" : first?.title || "Sheet1";
  if (fresh) {
    await gjson(`${SHEETS}/${id}:batchUpdate`, {
      method: "POST",
      json: { requests: [{ updateSheetProperties: { properties: { sheetId, title: tab, gridProperties: { frozenRowCount: 1 } }, fields: "title,gridProperties.frozenRowCount" } }] },
    });
  }
  const range = `'${tab.replace(/'/g, "''")}'`;
  if (!fresh) await gjson(`${SHEETS}/${id}/values/${encodeURIComponent(range)}:clear`, { method: "POST", json: {} });
  await gjson(`${SHEETS}/${id}/values/${encodeURIComponent(`${range}!A1`)}?valueInputOption=RAW`, {
    method: "PUT",
    json: { range: `${range}!A1`, majorDimension: "ROWS", values: [header, ...rows] },
  });
  await gjson(`${SHEETS}/${id}:batchUpdate`, {
    method: "POST",
    json: {
      requests: [
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: "userEnteredFormat.textFormat.bold" } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: header.length } } },
      ],
    },
  });
}

async function newSheet(name: string, parent: string, appProperties?: Record<string, string>) {
  // Created through Drive so it goes straight into the folder (the Sheets API always files it in My Drive).
  return gjson<{ id: string; webViewLink?: string }>(`${DRIVE}/files?fields=id,webViewLink`, {
    method: "POST",
    json: { name, mimeType: "application/vnd.google-apps.spreadsheet", parents: [parent], ...(appProperties ? { appProperties } : {}) },
  });
}
const sheetUrl = (f: { id: string; webViewLink?: string }) => f.webViewLink ?? `https://docs.google.com/spreadsheets/d/${f.id}/edit`;

/** Creates a Google Sheet in the QASync folder, with a bold, frozen header row. Returns its URL. */
export async function exportToSheets(title: string, header: string[], rows: Cell[][]): Promise<string> {
  const dir = await qasyncFolder();
  const file = await newSheet(title, dir.id);
  await writeSheet(file.id, header, rows, true);
  return sheetUrl(file);
}

/** Finds a file QASync tagged earlier, or null. */
async function findTagged(conditions: string[]): Promise<{ id: string; webViewLink?: string } | null> {
  const q = [...conditions, "trashed=false"].join(" and ");
  const r = await gjson<{ files?: { id: string; webViewLink?: string }[] }>(`${DRIVE}/files?q=${encodeURIComponent(q)}&spaces=drive&pageSize=1&fields=files(id,webViewLink)`);
  return r.files?.[0] ?? null;
}
const tag = (key: string, value: string) => `appProperties has { key=${lit(key)} and value=${lit(value)} }`;

const projectFolders = new Map<string, Promise<{ id: string; url: string }>>();

/** QASync / <project name>: one folder per project inside the QASync folder. */
function projectFolder(projectId: string, projectName: string) {
  let p = projectFolders.get(projectId);
  if (!p) {
    p = (async () => {
      const root = await qasyncFolder();
      const found = await findTagged([`mimeType='${FOLDER_MIME}'`, tag("qasyncProject", projectId), `${lit(root.id)} in parents`]);
      const f =
        found ??
        (await gjson<{ id: string; webViewLink?: string }>(`${DRIVE}/files?fields=id,webViewLink`, {
          method: "POST",
          json: { name: projectName.slice(0, 120) || "Project", mimeType: FOLDER_MIME, parents: [root.id], appProperties: { qasync: "project", qasyncProject: projectId } },
        }));
      return { id: f.id, url: f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}` };
    })();
    p.catch(() => projectFolders.delete(projectId));
    projectFolders.set(projectId, p);
  }
  return p;
}

/** A short, stable id for a page (Drive app tags are limited to 124 bytes). */
async function pageTag(pageKey: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pageKey));
  return [...new Uint8Array(hash).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The review canvas's "Send": keeps one sheet per page in QASync / <project>, holding every comment
 * on that page. Sending again updates the same sheet. Returns the sheet's and the folder's URLs.
 */
export async function syncPageSheet(p: { projectId: string; projectName: string; pageKey: string; pageName: string; header: string[]; rows: Cell[][] }) {
  const dir = await projectFolder(p.projectId, p.projectName);
  const key = await pageTag(p.pageKey);
  const found = await findTagged([`mimeType='application/vnd.google-apps.spreadsheet'`, tag("qasyncPage", key), `${lit(dir.id)} in parents`]);
  const file = found ?? (await newSheet(`${p.pageName} · ${p.projectName}`.slice(0, 200), dir.id, { qasync: "page", qasyncPage: key, qasyncProject: p.projectId }));
  await writeSheet(file.id, p.header, p.rows, !found);
  return { url: sheetUrl(file), folderUrl: dir.url, updated: !!found };
}

/** Uploads HTML into the QASync folder and lets Drive convert it into a Google Doc. Returns the doc's URL. */
export async function saveAsGoogleDoc(title: string, html: string): Promise<string> {
  const dir = await qasyncFolder();
  const boundary = `qasync${Math.random().toString(36).slice(2)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.document", parents: [dir.id] })}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
  const doc = await gjson<{ id: string; webViewLink?: string }>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return doc.webViewLink ?? `https://docs.google.com/document/d/${doc.id}/edit`;
}

/** Google's file picker, limited to images. Returns the picked file, or null when cancelled. */
export async function pickDriveImage(): Promise<PickerDoc | null> {
  const t = await googleToken();
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((r) => w().gapi!.load("picker", r));
  const g = w().google!.picker;
  return new Promise((resolve) => {
    const view = new g.DocsView(g.ViewId.DOCS_IMAGES);
    view.setMimeTypes("image/png,image/jpeg,image/webp");
    view.setIncludeFolders(true);
    new g.PickerBuilder()
      .setAppId(cfg.appId)
      .setOAuthToken(t)
      .setDeveloperKey(cfg.apiKey)
      .addView(view)
      .setTitle("Choose a design image")
      .setCallback((d) => {
        if (d.action === g.Action.PICKED && d.docs?.[0]) resolve(d.docs[0]);
        else if (d.action === g.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

/** Downloads a picked file (drive.file lets us read exactly the files the user picked). */
export async function downloadDriveFile(doc: PickerDoc): Promise<File> {
  const t = await googleToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`, { headers: { authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`Couldn't download “${doc.name}” from Drive (HTTP ${res.status})`);
  return new File([await res.blob()], doc.name, { type: doc.mimeType });
}

/** Plain CSV download: works with no Google account at all. */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
