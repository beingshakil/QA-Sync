import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import { q, q1, run } from "./db";
import { seal, unseal } from "./crypto";
import { getIssue, updateIssue } from "./repo";
import { reportError } from "./monitor";
import { integrationKeys } from "./integration-keys";
import { SITE_URL } from "@/lib/site";
import type { Issue, Priority, Status } from "@/lib/types";

/**
 * Notion integration: one connection per workspace (OAuth, token encrypted at rest), one database per
 * project. Issues go out as database rows with the comment, element specs, environment and screenshot;
 * status comes back from Notion on a lazy sync (and "Sync now"). A status of Verified set in Notion
 * is not accepted: only a person in QASync verifies a fix, so QASync writes its own status back.
 *
 * Keys: NOTION_CLIENT_ID, NOTION_CLIENT_SECRET (a Notion public integration), or pasted in the setup popup. NOTION_API_BASE only
 * overrides the API address for tests.
 */

const VERSION = "2022-06-28";
const api = () => (process.env.NOTION_API_BASE || "https://api.notion.com").replace(/\/+$/, "");
/** The app's Notion integration keys: from the environment, or pasted once in the setup popup. */
export const notionConfigured = async (fresh = false) => !!(await integrationKeys(fresh)).notion;

export type NotionMode = "all" | "urgent" | "manual";
export const NOTION_MODES: NotionMode[] = ["all", "urgent", "manual"];

const STATUS_NAME: Record<Status, string> = { open: "Open", in_progress: "In progress", in_review: "In review", fixed: "Fixed", verified: "Verified", wont_fix: "Won't fix" };
const STATUS_FROM_NAME = Object.fromEntries(Object.entries(STATUS_NAME).map(([k, v]) => [v.toLowerCase(), k as Status]));
const PRIORITY_NAME: Record<Priority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

/** Logical property → its type and options. Actual names live per link (an existing database may
 *  already use a name for something else; we then use "QA <name>"). */
const PROPS = {
  title: { name: "Name", type: "title" },
  status: { name: "Status", type: "select", options: [["Open", "red"], ["In progress", "orange"], ["In review", "yellow"], ["Fixed", "blue"], ["Verified", "green"], ["Won't fix", "gray"]] },
  priority: { name: "Priority", type: "select", options: [["Urgent", "red"], ["High", "orange"], ["Medium", "yellow"], ["Low", "gray"]] },
  page: { name: "Page", type: "url" },
  device: { name: "Device", type: "select", options: [["Desktop", "default"], ["Tablet", "default"], ["Mobile", "default"]] },
  reporter: { name: "Reporter", type: "rich_text" },
  assignee: { name: "Assignee", type: "rich_text" },
  link: { name: "QASync link", type: "url" },
  id: { name: "Issue ID", type: "rich_text" },
  created: { name: "Created", type: "date" },
} as const;
type Logical = keyof typeof PROPS;
export type PropNames = Record<Logical, string>;

/* ───────── HTTP ───────── */

class NotionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function notion<T = Record<string, unknown>>(token: string, method: string, path: string, body?: unknown, tries = 2): Promise<T> {
  const res = await fetch(`${api()}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "notion-version": VERSION, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 429 && tries > 1) {
    const wait = Math.min(5, Number(res.headers.get("retry-after")) || 1);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return notion(token, method, path, body, tries - 1);
  }
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new NotionError(res.status, data.message || `Notion answered HTTP ${res.status}`);
  return data as T;
}

/* ───────── OAuth ───────── */

function stateKey() {
  return createHmac("sha256", process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev").update("qasync-notion-state").digest();
}

type OAuthState = { workspaceId: string; userId: string; projectId: string; back?: string };

/** Signed, 15-minute OAuth state: who started the connection, which project, and where to come back to. */
export function makeState(d: OAuthState) {
  const body = Buffer.from(JSON.stringify({ ...d, exp: Date.now() + 15 * 60 * 1000, n: nanoid(8) })).toString("base64url");
  return `${body}.${createHmac("sha256", stateKey()).update(body).digest("base64url")}`;
}

export function readState(state: string | null): OAuthState | null {
  const [body, sig] = (state ?? "").split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", stateKey()).update(body).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  const d = JSON.parse(Buffer.from(body, "base64url").toString());
  return d.exp > Date.now() ? d : null;
}

export async function authorizeUrl(state: string, redirectUri: string) {
  const keys = (await integrationKeys(true)).notion; // fresh: keys may have just been saved on another server instance
  if (!keys) throw new Error("Notion isn't set up yet");
  const u = new URL(`${api()}/v1/oauth/authorize`);
  u.searchParams.set("client_id", keys.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("owner", "user");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeCode(code: string, redirectUri: string) {
  const keys = (await integrationKeys(true)).notion; // fresh: keys may have just been saved on another server instance
  if (!keys) throw new Error("Notion isn't set up yet");
  const basic = Buffer.from(`${keys.clientId}:${keys.clientSecret}`).toString("base64");
  const res = await fetch(`${api()}/v1/oauth/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/json", "notion-version": VERSION },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; workspace_name?: string; message?: string };
  if (!res.ok || !data.access_token) throw new Error(data.message || "Notion didn't accept the connection");
  return { token: data.access_token, accountName: data.workspace_name || "Notion" };
}

/* ───────── storage ───────── */

export async function saveIntegration(workspaceId: string, userId: string, token: string, accountName: string) {
  await run(
    `INSERT INTO integrations (id, workspace_id, provider, account_name, secret, created_by, created_at) VALUES (?, ?, 'notion', ?, ?, ?, ?)
     ON CONFLICT (workspace_id, provider) DO UPDATE SET account_name = excluded.account_name, secret = excluded.secret, created_by = excluded.created_by, created_at = excluded.created_at`,
    nanoid(10),
    workspaceId,
    accountName,
    seal(JSON.stringify({ token })),
    userId,
    new Date().toISOString(),
  );
}

export async function getIntegration(workspaceId: string): Promise<{ accountName: string; token: string } | null> {
  const r = await q1("SELECT * FROM integrations WHERE workspace_id = ? AND provider = 'notion'", workspaceId);
  if (!r) return null;
  try {
    return { accountName: (r.account_name as string) || "Notion", token: JSON.parse(unseal(r.secret as string)).token };
  } catch {
    return null;
  }
}

export async function disconnectNotion(workspaceId: string) {
  await run("DELETE FROM notion_pages WHERE issue_id IN (SELECT i.id FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = ?)", workspaceId);
  await run("DELETE FROM notion_links WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ?)", workspaceId);
  await run("DELETE FROM integrations WHERE workspace_id = ? AND provider = 'notion'", workspaceId);
}

export type NotionLink = { projectId: string; databaseId: string; databaseUrl: string | null; mode: NotionMode; lastSyncAt: string | null; props: PropNames };

export async function getLink(projectId: string): Promise<NotionLink | null> {
  const r = await q1("SELECT * FROM notion_links WHERE project_id = ?", projectId);
  if (!r) return null;
  return {
    projectId,
    databaseId: r.database_id as string,
    databaseUrl: (r.database_url as string) || null,
    mode: (r.mode as NotionMode) || "all",
    lastSyncAt: (r.last_sync_at as string) || null,
    props: { ...defaultNames(), ...(r.props ? JSON.parse(r.props as string) : {}) },
  };
}

const defaultNames = () => Object.fromEntries(Object.entries(PROPS).map(([k, v]) => [k, v.name])) as PropNames;

export async function setMode(projectId: string, mode: NotionMode) {
  await run("UPDATE notion_links SET mode = ? WHERE project_id = ?", mode, projectId);
}

export async function unlinkProject(projectId: string) {
  await run("DELETE FROM notion_pages WHERE issue_id IN (SELECT id FROM issues WHERE project_id = ?)", projectId);
  await run("DELETE FROM notion_links WHERE project_id = ?", projectId);
}

/* ───────── targets & databases ───────── */

type SearchHit = { id: string; object: "page" | "database"; url?: string; title?: { plain_text: string }[]; properties?: Record<string, { type: string; title?: { plain_text: string }[] }> };

function titleOf(h: SearchHit): string {
  if (h.object === "database") return h.title?.map((t) => t.plain_text).join("") || "Untitled database";
  const prop = Object.values(h.properties ?? {}).find((p) => p.type === "title");
  return prop?.title?.map((t) => t.plain_text).join("") || "Untitled page";
}

/** Pages and databases the user shared with QASync while connecting. */
export async function searchTargets(token: string, query: string) {
  const r = await notion<{ results: SearchHit[] }>(token, "POST", "/v1/search", { query: query || undefined, page_size: 50 });
  return r.results.map((h) => ({ id: h.id, type: h.object, title: titleOf(h), url: h.url ?? null }));
}

const propSchema = (l: Logical) => {
  const p = PROPS[l];
  if ("options" in p) return { select: { options: p.options.map(([name, color]) => ({ name, color })) } };
  return { [p.type]: {} };
};

/** Creates the ready-made "QASync Issues" database under a page. */
export async function createDatabase(token: string, parentPageId: string, projectName: string) {
  const properties = Object.fromEntries((Object.keys(PROPS) as Logical[]).map((l) => [PROPS[l].name, propSchema(l)]));
  const db = await notion<{ id: string; url: string }>(token, "POST", "/v1/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: `QASync Issues · ${projectName}`.slice(0, 100) } }],
    properties,
  });
  return { databaseId: db.id, url: db.url, props: defaultNames() };
}

/** Uses an existing database: keeps its title column, adds what's missing, and steps around
 *  same-named columns of another type (e.g. Notion's own "status" type) with a "QA " prefix. */
export async function adoptDatabase(token: string, databaseId: string) {
  const db = await notion<{ id: string; url: string; properties: Record<string, { type: string }> }>(token, "GET", `/v1/databases/${databaseId}`);
  const names = defaultNames();
  const add: Record<string, unknown> = {};
  for (const l of Object.keys(PROPS) as Logical[]) {
    if (l === "title") {
      names.title = Object.entries(db.properties).find(([, p]) => p.type === "title")?.[0] ?? "Name";
      continue;
    }
    const want = PROPS[l];
    const existing = db.properties[want.name];
    if (existing && existing.type === want.type) continue;
    if (existing) names[l] = `QA ${want.name}`;
    if (!db.properties[names[l]]) add[names[l]] = propSchema(l);
  }
  if (Object.keys(add).length) await notion(token, "PATCH", `/v1/databases/${databaseId}`, { properties: add });
  return { databaseId: db.id, url: db.url, props: names };
}

export async function linkProject(projectId: string, d: { databaseId: string; url: string | null; props: PropNames }, mode: NotionMode) {
  // Another database: rows in the old one stay there, and issues start fresh in the new one.
  const prev = await getLink(projectId);
  if (prev && prev.databaseId !== d.databaseId) await run("DELETE FROM notion_pages WHERE issue_id IN (SELECT id FROM issues WHERE project_id = ?)", projectId);
  await run(
    `INSERT INTO notion_links (project_id, database_id, database_url, mode, created_at, props) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (project_id) DO UPDATE SET database_id = excluded.database_id, database_url = excluded.database_url, mode = excluded.mode, props = excluded.props, last_sync_at = NULL`,
    projectId,
    d.databaseId,
    d.url,
    mode,
    new Date().toISOString(),
    JSON.stringify(d.props),
  );
}

/* ───────── issues → Notion ───────── */

const text = (s: string) => [{ type: "text", text: { content: s.slice(0, 2000) } }];
const chunks = (s: string, n = 1900) => (s.match(new RegExp(`[\\s\\S]{1,${n}}`, "g")) ?? []);
const issueLink = (i: Issue) => `${SITE_URL}/app/projects/${i.projectId}/review?issue=${i.id}`;

function properties(i: Issue, names: PropNames) {
  const device = i.device ? i.device[0].toUpperCase() + i.device.slice(1) : "Desktop";
  return {
    [names.title]: { title: text(`#${i.number} ${i.title}`) },
    [names.status]: { select: { name: STATUS_NAME[i.status] } },
    [names.priority]: { select: { name: PRIORITY_NAME[i.priority] } },
    [names.page]: { url: /^https?:\/\//.test(i.pageUrl) ? i.pageUrl : `${SITE_URL}${i.pageUrl}` },
    [names.device]: { select: { name: ["Desktop", "Tablet", "Mobile"].includes(device) ? device : "Desktop" } },
    [names.reporter]: { rich_text: text(i.reporterName || "") },
    [names.assignee]: { rich_text: text(i.assignee || "") },
    [names.link]: { url: issueLink(i) },
    [names.id]: { rich_text: text(i.id) },
    [names.created]: { date: { start: i.createdAt } },
  };
}

function blocks(i: Issue) {
  const out: Record<string, unknown>[] = [];
  const para = (s: string) => out.push({ object: "block", type: "paragraph", paragraph: { rich_text: text(s) } });
  const bullet = (s: string) => out.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: text(s) } });
  const heading = (s: string) => out.push({ object: "block", type: "heading_3", heading_3: { rich_text: text(s) } });
  for (const c of chunks(i.body || "")) para(c);
  for (const a of i.attachments.filter((x) => x.mime.startsWith("image/"))) {
    out.push({ object: "block", type: "image", image: { type: "external", external: { url: a.url.startsWith("http") ? a.url : `${SITE_URL}${a.url}` } } });
  }
  if (i.element || i.selector) {
    heading("Element");
    if (i.selector) bullet(`Selector: ${i.selector}`);
    const e = i.element;
    if (e) {
      bullet(`${e.tag}${e.text ? ` · “${e.text.slice(0, 80)}”` : ""} · ${Math.round(e.width)}×${Math.round(e.height)} px`);
      bullet(`Font: ${e.font} ${e.weight}, ${e.size} / ${e.lineHeight}`);
      bullet(`Colour: ${e.color} on ${e.bg}${e.contrast ? ` · contrast ${e.contrast}:1` : ""} · padding ${e.padding}`);
    }
  }
  if (i.env) {
    heading("Environment");
    bullet(`${i.env.browser} on ${i.env.os} · ${i.viewportW}px wide (${i.device}) · DPR ${i.env.dpr}`);
    if (i.env.url) bullet(`Page: ${i.env.url}`);
    if (i.env.consoleErrors?.length) {
      out.push({ object: "block", type: "code", code: { language: "plain text", rich_text: text(i.env.consoleErrors.slice(-10).join("\n")) } });
    }
  }
  out.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Open in QASync ↗", link: { url: issueLink(i) } } }] } });
  return out.slice(0, 100);
}

/** Creates or updates the issue's row. Returns its Notion URL. */
export async function pushIssue(issueId: string): Promise<string | null> {
  const issue = await getIssue(issueId);
  if (!issue) return null;
  const link = await getLink(issue.projectId);
  const integ = link ? await getIntegration(issue.workspaceId) : null;
  if (!link || !integ) throw new Error("This project isn't linked to Notion");
  const props = properties(issue, link.props);
  const mapped = await q1("SELECT * FROM notion_pages WHERE issue_id = ?", issueId);
  const now = new Date().toISOString();
  if (mapped) {
    try {
      await notion(integ.token, "PATCH", `/v1/pages/${mapped.page_id}`, { properties: props });
      await run("UPDATE notion_pages SET status = ?, synced_at = ? WHERE issue_id = ?", issue.status, now, issueId);
      return (mapped.page_url as string) || null;
    } catch (e) {
      // The row was deleted or archived in Notion: create a fresh one below.
      if (!(e instanceof NotionError) || (e.status !== 404 && e.status !== 400)) throw e;
      await run("DELETE FROM notion_pages WHERE issue_id = ?", issueId);
    }
  }
  const page = await notion<{ id: string; url: string }>(integ.token, "POST", "/v1/pages", { parent: { database_id: link.databaseId }, properties: props, children: blocks(issue) });
  await run("INSERT INTO notion_pages (issue_id, page_id, page_url, status, synced_at) VALUES (?, ?, ?, ?, ?)", issueId, page.id, page.url, issue.status, now);
  return page.url;
}

export async function notionPageFor(issueId: string): Promise<string | null> {
  const r = await q1("SELECT page_url FROM notion_pages WHERE issue_id = ?", issueId);
  return (r?.page_url as string) || null;
}

/** Issue id → Notion row URL, for every issue of the project that's already in Notion. */
export async function notionPagesFor(projectId: string): Promise<Record<string, string>> {
  const rows = await q("SELECT np.issue_id, np.page_url FROM notion_pages np JOIN issues i ON i.id = np.issue_id WHERE i.project_id = ?", projectId);
  return Object.fromEntries(rows.filter((r) => r.page_url).map((r) => [r.issue_id as string, r.page_url as string]));
}

/** After an issue is created: send it if the project's mode says so. Never blocks the request. */
export function autoPush(issue: Pick<Issue, "id" | "projectId" | "priority" | "pageUrl">) {
  void (async () => {
    const link = await getLink(issue.projectId);
    if (!link || link.mode === "manual") return;
    if (link.mode === "urgent" && issue.priority !== "urgent" && issue.priority !== "high") return;
    await pushIssue(issue.id);
  })().catch((e) => reportError({ kind: "integration", message: `Notion: ${(e as Error).message}`, url: issue.pageUrl }));
}

/** After an issue changes in QASync: update its row if it has one. Never blocks the request. */
export function pushChange(issueId: string) {
  void (async () => {
    if (!(await q1("SELECT 1 FROM notion_pages WHERE issue_id = ?", issueId))) return;
    await pushIssue(issueId);
  })().catch((e) => reportError({ kind: "integration", message: `Notion: ${(e as Error).message}` }));
}

/* ───────── Notion → issues ───────── */

type Row = { id: string; properties: Record<string, { type: string; select?: { name: string } | null }> };

/** Reads status changes made in Notion since the last sync and applies them. */
export async function syncProject(projectId: string): Promise<{ checked: number; updated: number }> {
  const link = await getLink(projectId);
  const proj = await q1("SELECT workspace_id FROM projects WHERE id = ?", projectId);
  const integ = link && proj ? await getIntegration(proj.workspace_id as string) : null;
  if (!link || !integ) return { checked: 0, updated: 0 };
  const started = new Date().toISOString();
  const since = link.lastSyncAt ? new Date(Date.parse(link.lastSyncAt) - 2 * 60 * 1000).toISOString() : null;
  let cursor: string | undefined;
  let checked = 0, updated = 0;
  for (let n = 0; n < 5; n++) {
    const r = await notion<{ results: Row[]; has_more: boolean; next_cursor: string | null }>(integ.token, "POST", `/v1/databases/${link.databaseId}/query`, {
      page_size: 100,
      start_cursor: cursor,
      ...(since ? { filter: { timestamp: "last_edited_time", last_edited_time: { after: since } } } : {}),
    });
    for (const row of r.results) {
      const mapped = await q1("SELECT * FROM notion_pages WHERE page_id = ?", row.id);
      if (!mapped) continue;
      checked++;
      const name = row.properties[link.props.status]?.select?.name?.toLowerCase();
      const fromNotion = name ? STATUS_FROM_NAME[name] : undefined;
      if (!fromNotion || fromNotion === mapped.status) continue;
      const issue = await getIssue(mapped.issue_id as string);
      if (!issue) continue;
      if (fromNotion === "verified" && issue.status !== "verified") {
        // Only a person in QASync verifies a fix: put QASync's status back in Notion.
        await notion(integ.token, "PATCH", `/v1/pages/${row.id}`, { properties: { [link.props.status]: { select: { name: STATUS_NAME[issue.status] } } } });
        await run("UPDATE notion_pages SET status = ?, synced_at = ? WHERE issue_id = ?", issue.status, started, issue.id);
        continue;
      }
      if (fromNotion !== issue.status) {
        await updateIssue(issue.id, { status: fromNotion }, "Notion");
        updated++;
      }
      await run("UPDATE notion_pages SET status = ?, synced_at = ? WHERE issue_id = ?", fromNotion, started, issue.id);
    }
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  await run("UPDATE notion_links SET last_sync_at = ? WHERE project_id = ?", started, projectId);
  return { checked, updated };
}

const g = globalThis as unknown as { __qasyncNotionSyncing?: Set<string> };
const syncing = (g.__qasyncNotionSyncing ??= new Set());

/** Lazy sync: at most every 2 minutes per project, triggered when someone looks at its issues. */
export function maybeSync(projectId: string) {
  if (syncing.has(projectId)) return;
  syncing.add(projectId);
  void (async () => {
    const link = await getLink(projectId);
    if (!link || (link.lastSyncAt && Date.now() - Date.parse(link.lastSyncAt) < 2 * 60 * 1000)) return;
    await syncProject(projectId);
  })()
    .catch((e) => reportError({ kind: "integration", message: `Notion sync: ${(e as Error).message}` }))
    .finally(() => syncing.delete(projectId));
}

export async function linkedProjects(): Promise<string[]> {
  return (await q("SELECT project_id FROM notion_links")).map((r) => r.project_id as string);
}
