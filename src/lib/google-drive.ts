/**
 * Google Drive from the browser's side. Drive permission comes with "Sign in with Google" and lives
 * on the server (src/server/google.ts), so these call QASync's own /api/google routes; only Google's
 * file picker runs in the browser, with a short-lived token from the server.
 */

/** What every page knows (set by the app layout): is Drive possible here, and can files be picked from it. */
export type GoogleConfig = { available: boolean; picker: boolean };
let cfg: GoogleConfig = { available: false, picker: false };
export function setGoogleConfig(c: GoogleConfig | null) {
  if (c) cfg = c;
}
export const googleExportReady = () => cfg.available;
export const googlePickerReady = () => cfg.available && cfg.picker;

export const DRIVE_FOLDER_NAME = "QASync";

/** code "connect": this person needs to connect Google Drive; "setup": an admin must turn on an API (href says where). */
export class DriveError extends Error {
  constructor(
    message: string,
    readonly code: "connect" | "setup" | "google" = "google",
    readonly href: string | null = null,
  ) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new DriveError(d.error ?? `Google Drive failed (HTTP ${res.status})`, d.code ?? "google", d.href ?? null);
  return d as T;
}

export type DriveStatus = {
  available: boolean;
  connected: boolean;
  email: string | null;
  folderUrl: string | null;
  project?: { linked: false } | { linked: true; ownerEmail: string | null; folderUrl: string | null; mine: boolean };
};
export const driveStatus = (projectId?: string) => call<DriveStatus>(`/api/google${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`);
export const disconnectGoogleDrive = () => call("/api/google", { method: "DELETE" });

/** A new Google Sheet in the QASync folder. Returns its URL. */
export const exportToSheets = (title: string, header: string[], rows: (string | number)[][]) =>
  call<{ url: string }>("/api/google/sheet", { method: "POST", json: { title, header, rows } }).then((r) => r.url);

/** HTML saved as a Google Doc in the QASync folder. Returns its URL. */
export const saveAsGoogleDoc = (title: string, html: string) => call<{ url: string }>("/api/google/doc", { method: "POST", json: { title, html } }).then((r) => r.url);

/** The page's sheet in QASync / <project>, written now and kept in sync afterwards. */
export const sendPageToDrive = (projectId: string, pageUrl: string) =>
  call<{ url: string; folderUrl: string | null; updated: boolean; rows: number; ownerEmail: string | null }>("/api/google/page", { method: "POST", json: { projectId, pageUrl } });

/* ───────── Google's file picker ───────── */

type PickerDoc = { id: string; name: string; mimeType: string };
type PickerNs = {
  DocsView: new (viewId?: unknown) => { setMimeTypes(m: string): unknown; setIncludeFolders(b: boolean): unknown };
  ViewId: { DOCS_IMAGES: unknown };
  PickerBuilder: new () => PickerBuilder;
  Action: { PICKED: string; CANCEL: string };
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
const w = () => window as unknown as { google?: { picker: PickerNs }; gapi?: { load(lib: string, cb: () => void): void } };

let gapiLoading: Promise<void> | null = null;
function loadGapi(): Promise<void> {
  gapiLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gapiLoading = null;
      reject(new DriveError("Couldn't load Google's file picker. Check your connection or ad blocker."));
    };
    document.head.appendChild(s);
  });
  return gapiLoading;
}

/** Warm up the picker script so it opens straight away. */
export function preloadGoogle() {
  if (googlePickerReady()) loadGapi().catch(() => {});
}

/** Google's picker, limited to images. Returns the picked file, or null when cancelled. */
export async function pickDriveImage(): Promise<PickerDoc | null> {
  const [{ token, apiKey, appId }] = await Promise.all([call<{ token: string; apiKey: string; appId: string }>("/api/google/picker"), loadGapi()]);
  await new Promise<void>((r) => w().gapi!.load("picker", r));
  const g = w().google!.picker;
  return new Promise((resolve) => {
    const view = new g.DocsView(g.ViewId.DOCS_IMAGES);
    view.setMimeTypes("image/png,image/jpeg,image/webp");
    view.setIncludeFolders(true);
    new g.PickerBuilder()
      .setAppId(appId)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
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

/** The picked image, fetched through QASync's server (which may read exactly the files picked). */
export async function downloadDriveFile(doc: PickerDoc): Promise<File> {
  const res = await fetch(`/api/google/file?id=${encodeURIComponent(doc.id)}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new DriveError(d.error ?? `Couldn't download “${doc.name}” from Drive`, d.code ?? "google", d.href ?? null);
  }
  return new File([await res.blob()], doc.name, { type: res.headers.get("content-type") ?? doc.mimeType });
}

/* ───────── CSV ───────── */

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
