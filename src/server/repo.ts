import "server-only";
import { nanoid } from "nanoid";
import { db } from "./db";
import { pageKey } from "@/lib/utils";
import { OPEN_STATUSES, pageState } from "@/lib/types";
import type {
  Activity,
  Attachment,
  Design,
  Workspace,
  Page,
  Audit,
  Comment,
  Issue,
  Priority,
  Project,
  ShareLink,
  Status,
} from "@/lib/types";

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
const parse = <T>(v: unknown): T | null => (typeof v === "string" && v ? (JSON.parse(v) as T) : null);

/* ───────── mappers ───────── */
function toProject(r: Row): Project {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Project["type"],
    baseUrl: r.base_url as string,
    figmaUrl: (r.figma_url as string) ?? null,
    color: r.color as string,
    createdAt: r.created_at as string,
    issueCount: (r.issue_count as number) ?? undefined,
    openCount: (r.open_count as number) ?? undefined,
  };
}

function toIssue(r: Row): Issue {
  return {
    id: r.id as string,
    number: r.number as number,
    projectId: r.project_id as string,
    pageUrl: r.page_url as string,
    title: r.title as string,
    body: r.body as string,
    status: r.status as Status,
    priority: r.priority as Priority,
    assignee: (r.assignee as string) ?? null,
    reporterName: r.reporter_name as string,
    reporterType: r.reporter_type as Issue["reporterType"],
    selector: (r.selector as string) ?? null,
    xPct: r.x_pct as number,
    yPct: r.y_pct as number,
    viewportW: r.viewport_w as number,
    device: r.device as string,
    element: parse(r.element),
    env: parse(r.env),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    resolvedAt: (r.resolved_at as string) ?? null,
    verifiedAt: (r.verified_at as string) ?? null,
    editedAt: (r.edited_at as string) ?? null,
    attachments: parse<Attachment[]>(r.attachments) ?? [],
    commentCount: (r.comment_count as number) ?? undefined,
    projectName: (r.project_name as string) ?? undefined,
  };
}

const toComment = (r: Row): Comment => ({
  id: r.id as string,
  issueId: r.issue_id as string,
  author: r.author as string,
  authorType: r.author_type as Comment["authorType"],
  body: r.body as string,
  createdAt: r.created_at as string,
  editedAt: (r.edited_at as string) ?? null,
});

const toActivity = (r: Row): Activity => ({
  id: r.id as string,
  issueId: r.issue_id as string,
  type: r.type as Activity["type"],
  fromVal: (r.from_val as string) ?? null,
  toVal: (r.to_val as string) ?? null,
  actor: r.actor as string,
  createdAt: r.created_at as string,
});

/* ───────── projects ───────── */
const PROJECT_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id) AS issue_count,
    (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('verified','wont_fix','fixed')) AS open_count
  FROM projects p`;

export function listProjects(): Project[] {
  return (db().prepare(`${PROJECT_SELECT} ORDER BY p.created_at DESC`).all() as Row[]).map(toProject);
}

export function getProject(id: string): Project | null {
  const r = db().prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id) as Row | undefined;
  return r ? toProject(r) : null;
}

const PROJECT_COLORS = ["#2b5ebe", "#7b2fb0", "#5f8ad0", "#a974cc", "#1f4c9c", "#5e1d95"];

export function createProject(input: { name: string; baseUrl: string; type?: Project["type"]; figmaUrl?: string | null }): Project {
  const id = nanoid(10);
  const count = (db().prepare("SELECT COUNT(*) AS n FROM projects").get() as { n: number }).n;
  db()
    .prepare("INSERT INTO projects (id, name, type, base_url, figma_url, color, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, input.name, input.type ?? "website", input.baseUrl, input.figmaUrl ?? null, PROJECT_COLORS[count % PROJECT_COLORS.length], now());
  return getProject(id)!;
}

export function updateProject(id: string, patch: Partial<Pick<Project, "name" | "baseUrl" | "figmaUrl">>): Project | null {
  const cur = getProject(id);
  if (!cur) return null;
  db()
    .prepare("UPDATE projects SET name = ?, base_url = ?, figma_url = ? WHERE id = ?")
    .run(patch.name ?? cur.name, patch.baseUrl ?? cur.baseUrl, patch.figmaUrl ?? cur.figmaUrl, id);
  return getProject(id);
}

export function deleteProject(id: string) {
  db().prepare("DELETE FROM projects WHERE id = ?").run(id);
}

/* ───────── issues ───────── */
export interface IssueFilter {
  projectId?: string;
  status?: Status | "active";
  pageUrl?: string;
  assignee?: string;
  q?: string;
}

export function listIssues(f: IssueFilter = {}): Issue[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.projectId) { where.push("i.project_id = ?"); args.push(f.projectId); }
  if (f.status === "active") where.push("i.status NOT IN ('verified','wont_fix')");
  else if (f.status) { where.push("i.status = ?"); args.push(f.status); }
  if (f.pageUrl) { where.push("i.page_url = ?"); args.push(f.pageUrl); }
  if (f.assignee) { where.push("i.assignee = ?"); args.push(f.assignee); }
  if (f.q) { where.push("(i.title LIKE ? OR i.body LIKE ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }
  const sql = `
    SELECT i.*, p.name AS project_name,
      (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comment_count
    FROM issues i JOIN projects p ON p.id = i.project_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY i.created_at DESC`;
  return (db().prepare(sql).all(...args) as Row[]).map(toIssue);
}

export function getIssue(id: string): Issue | null {
  const r = db()
    .prepare(`SELECT i.*, p.name AS project_name, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comment_count
              FROM issues i JOIN projects p ON p.id = i.project_id WHERE i.id = ?`)
    .get(id) as Row | undefined;
  return r ? toIssue(r) : null;
}

export type NewIssue = Pick<Issue, "projectId" | "pageUrl" | "title" | "reporterName"> &
  Partial<Pick<Issue, "body" | "priority" | "assignee" | "reporterType" | "selector" | "xPct" | "yPct" | "viewportW" | "device" | "element" | "env" | "status" | "createdAt" | "attachments">>;

export function createIssue(input: NewIssue): Issue {
  const id = nanoid(12);
  const next = (db().prepare("SELECT COALESCE(MAX(number),0)+1 AS n FROM issues WHERE project_id = ?").get(input.projectId) as { n: number }).n;
  const ts = input.createdAt ?? now();
  db()
    .prepare(`INSERT INTO issues (id, number, project_id, page_url, title, body, status, priority, assignee, reporter_name, reporter_type,
              selector, x_pct, y_pct, viewport_w, device, element, env, created_at, updated_at, attachments)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      id, next, input.projectId, input.pageUrl, input.title, input.body ?? "", input.status ?? "open", input.priority ?? "medium",
      input.assignee ?? null, input.reporterName, input.reporterType ?? "member", input.selector ?? null,
      input.xPct ?? 0, input.yPct ?? 0, input.viewportW ?? 1280, input.device ?? "desktop",
      input.element ? JSON.stringify(input.element) : null, input.env ? JSON.stringify(input.env) : null, ts, ts,
      input.attachments?.length ? JSON.stringify(input.attachments) : null,
    );
  logActivity(id, "created", null, null, input.reporterName, ts);
  return getIssue(id)!;
}

export function updateIssue(
  id: string,
  patch: Partial<Pick<Issue, "status" | "priority" | "assignee" | "title" | "body">>,
  actor: string,
): Issue | null {
  const cur = getIssue(id);
  if (!cur) return null;
  const ts = now();
  const next = { ...cur, ...patch };
  let resolvedAt = cur.resolvedAt;
  let verifiedAt = cur.verifiedAt;
  if (patch.status && patch.status !== cur.status) {
    logActivity(id, "status", cur.status, patch.status, actor, ts);
    if (patch.status === "fixed") resolvedAt = ts;
    if (patch.status === "verified") { verifiedAt = ts; resolvedAt = resolvedAt ?? ts; }
    if (patch.status === "open" || patch.status === "in_progress") { resolvedAt = null; verifiedAt = null; }
  }
  if (patch.priority && patch.priority !== cur.priority) logActivity(id, "priority", cur.priority, patch.priority, actor, ts);
  if (patch.assignee !== undefined && patch.assignee !== cur.assignee) logActivity(id, "assignee", cur.assignee, patch.assignee, actor, ts);
  db()
    .prepare("UPDATE issues SET status=?, priority=?, assignee=?, title=?, body=?, updated_at=?, resolved_at=?, verified_at=?, edited_at=? WHERE id=?")
    .run(next.status, next.priority, next.assignee, next.title, next.body, ts, resolvedAt, verifiedAt,
      patch.title !== undefined && patch.title !== cur.title || patch.body !== undefined && patch.body !== cur.body ? ts : (cur.editedAt ?? null), id);
  return getIssue(id);
}

export function deleteIssue(id: string) {
  db().prepare("DELETE FROM issues WHERE id = ?").run(id);
}

/* ───────── comments & activity ───────── */
export function listComments(issueId: string): Comment[] {
  return (db().prepare("SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC").all(issueId) as Row[]).map(toComment);
}

export function addComment(input: { issueId: string; author: string; authorType?: Comment["authorType"]; body: string; createdAt?: string }): Comment {
  const id = nanoid(12);
  const ts = input.createdAt ?? now();
  db()
    .prepare("INSERT INTO comments (id, issue_id, author, author_type, body, created_at) VALUES (?,?,?,?,?,?)")
    .run(id, input.issueId, input.author, input.authorType ?? "member", input.body, ts);
  db().prepare("UPDATE issues SET updated_at = ? WHERE id = ?").run(ts, input.issueId);
  logActivity(input.issueId, "comment", null, null, input.author, ts);
  return toComment(db().prepare("SELECT * FROM comments WHERE id = ?").get(id) as Row);
}

export function logActivity(issueId: string, type: Activity["type"], fromVal: string | null, toVal: string | null, actor: string, ts = now()) {
  db()
    .prepare("INSERT INTO activity (id, issue_id, type, from_val, to_val, actor, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(nanoid(12), issueId, type, fromVal, toVal, actor, ts);
}

export function listActivity(issueId: string): Activity[] {
  return (db().prepare("SELECT * FROM activity WHERE issue_id = ? ORDER BY created_at ASC").all(issueId) as Row[]).map(toActivity);
}

export function recentActivity(limit = 12): (Activity & { issueTitle: string; issueNumber: number; projectId: string; projectName: string })[] {
  return (db()
    .prepare(`SELECT a.*, i.title AS issue_title, i.number AS issue_number, i.project_id, p.name AS project_name
              FROM activity a JOIN issues i ON i.id = a.issue_id JOIN projects p ON p.id = i.project_id
              ORDER BY a.created_at DESC LIMIT ?`)
    .all(limit) as Row[]).map((r) => ({
      ...toActivity(r),
      issueTitle: r.issue_title as string,
      issueNumber: r.issue_number as number,
      projectId: r.project_id as string,
      projectName: r.project_name as string,
    }));
}

/* ───────── share links ───────── */
export function createShare(projectId: string, role: ShareLink["role"] = "comment"): ShareLink {
  const token = nanoid(21);
  db().prepare("INSERT INTO share_links (token, project_id, role, created_at) VALUES (?,?,?,?)").run(token, projectId, role, now());
  return { token, projectId, role, createdAt: now() };
}

export function getShare(token: string): ShareLink | null {
  const r = db().prepare("SELECT * FROM share_links WHERE token = ?").get(token) as Row | undefined;
  return r ? { token: r.token as string, projectId: r.project_id as string, role: r.role as ShareLink["role"], createdAt: r.created_at as string } : null;
}

export function getOrCreateShare(projectId: string): ShareLink {
  const r = db().prepare("SELECT token FROM share_links WHERE project_id = ? ORDER BY created_at ASC LIMIT 1").get(projectId) as Row | undefined;
  return r ? getShare(r.token as string)! : createShare(projectId);
}

/* ───────── audits ───────── */
export function saveAudit(a: Omit<Audit, "id" | "createdAt">): Audit {
  const id = nanoid(10);
  const ts = now();
  db()
    .prepare("INSERT INTO audits (id, project_id, url, score, findings, stats, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, a.projectId, a.url, a.score, JSON.stringify(a.findings), JSON.stringify(a.stats), ts);
  return { ...a, id, createdAt: ts };
}

export function listAudits(projectId?: string): Audit[] {
  const rows = (projectId
    ? db().prepare("SELECT * FROM audits WHERE project_id = ? ORDER BY created_at DESC").all(projectId)
    : db().prepare("SELECT * FROM audits ORDER BY created_at DESC LIMIT 50").all()) as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    url: r.url as string,
    score: r.score as number,
    findings: JSON.parse(r.findings as string),
    stats: JSON.parse(r.stats as string),
    createdAt: r.created_at as string,
  }));
}

/* ───────── dashboard stats ───────── */
export function workspaceStats() {
  const q = (sql: string) => (db().prepare(sql).get() as { n: number }).n;
  const avgHours = db()
    .prepare("SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS h FROM issues WHERE resolved_at IS NOT NULL")
    .get() as { h: number | null };
  return {
    open: q("SELECT COUNT(*) AS n FROM issues WHERE status IN ('open','in_progress','in_review')"),
    awaitingVerify: q("SELECT COUNT(*) AS n FROM issues WHERE status = 'fixed'"),
    verified: q("SELECT COUNT(*) AS n FROM issues WHERE status = 'verified'"),
    urgent: q("SELECT COUNT(*) AS n FROM issues WHERE priority = 'urgent' AND status NOT IN ('verified','wont_fix','fixed')"),
    projects: q("SELECT COUNT(*) AS n FROM projects"),
    avgResolveHours: avgHours.h ? Math.round(avgHours.h) : null,
  };
}

/* ───────── workspace (Phase 1: one local workspace, one user) ───────── */
export function getWorkspace(): Workspace {
  const r = db().prepare("SELECT * FROM workspace WHERE id = 1").get() as Row;
  return { name: r.name as string, userName: r.user_name as string, members: JSON.parse(r.members as string) as string[] };
}

export function updateWorkspace(patch: Partial<Workspace>): Workspace {
  const cur = getWorkspace();
  const name = patch.name?.trim().slice(0, 60) || cur.name;
  const userName = patch.userName?.trim().slice(0, 60) || cur.userName;
  let members = (patch.members ?? cur.members).map((m) => m.trim().slice(0, 60)).filter(Boolean);
  // Renaming yourself carries your history with you.
  if (userName !== cur.userName) {
    const d = db();
    d.prepare("UPDATE issues SET reporter_name = ? WHERE reporter_name = ? AND reporter_type = 'member'").run(userName, cur.userName);
    d.prepare("UPDATE issues SET assignee = ? WHERE assignee = ?").run(userName, cur.userName);
    d.prepare("UPDATE comments SET author = ? WHERE author = ? AND author_type = 'member'").run(userName, cur.userName);
    d.prepare("UPDATE activity SET actor = ? WHERE actor = ?").run(userName, cur.userName);
    members = members.map((m) => (m === cur.userName ? userName : m));
  }
  if (!members.includes(userName)) members.unshift(userName);
  members = [...new Set(members)];
  db().prepare("UPDATE workspace SET name = ?, user_name = ?, members = ? WHERE id = 1").run(name, userName, JSON.stringify(members));
  return getWorkspace();
}

/* ───────── uploads & design references ───────── */
export function saveUpload(u: { id: string; file: string; mime: string; name: string; size: number }): Attachment {
  db().prepare("INSERT INTO uploads (id, file, mime, name, size, created_at) VALUES (?,?,?,?,?,?)").run(u.id, u.file, u.mime, u.name, u.size, now());
  return { id: u.id, url: `/api/uploads/${u.id}`, mime: u.mime, name: u.name, size: u.size };
}

export function getUpload(id: string): { file: string; mime: string; name: string; size: number } | null {
  const r = db().prepare("SELECT file, mime, name, size FROM uploads WHERE id = ?").get(id) as Row | undefined;
  return r ? { file: r.file as string, mime: r.mime as string, name: r.name as string, size: r.size as number } : null;
}

export function listDesigns(projectId: string, pageUrl?: string): Design[] {
  const rows = (pageUrl
    ? db().prepare("SELECT * FROM designs WHERE project_id = ? AND page_url = ? ORDER BY created_at DESC").all(projectId, pageUrl)
    : db().prepare("SELECT * FROM designs WHERE project_id = ? ORDER BY created_at DESC").all(projectId)) as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    pageUrl: r.page_url as string,
    device: r.device as string,
    url: `/api/uploads/${r.upload_id as string}`,
    createdAt: r.created_at as string,
  }));
}

export function addDesign(projectId: string, pageUrl: string, device: string, uploadId: string): Design {
  const id = nanoid(10);
  // One reference per page + device: replace the previous one.
  db().prepare("DELETE FROM designs WHERE project_id = ? AND page_url = ? AND device = ?").run(projectId, pageUrl, device);
  db().prepare("INSERT INTO designs (id, project_id, page_url, device, upload_id, created_at) VALUES (?,?,?,?,?,?)").run(id, projectId, pageUrl, device, uploadId, now());
  return listDesigns(projectId, pageUrl).find((d) => d.id === id)!;
}

export function deleteDesign(id: string) {
  db().prepare("DELETE FROM designs WHERE id = ?").run(id);
}

/* ───────── pages: the unit of QA tracking ───────── */
function toPageRow(r: Row) {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    url: r.url as string,
    key: r.key as string,
    title: (r.title as string) ?? null,
    qaStatus: r.qa_status as Page["qaStatus"],
    qaBy: (r.qa_by as string) ?? null,
    qaAt: (r.qa_at as string) ?? null,
    createdAt: r.created_at as string,
    lastVisitedAt: (r.last_visited_at as string) ?? null,
  };
}

/** Register a page (or refresh its title / last visit). Returns the page id. */
export function upsertPage(projectId: string, url: string, opts: { title?: string | null; visited?: boolean } = {}): string {
  const key = pageKey(url);
  const ts = now();
  const cur = db().prepare("SELECT id, title FROM pages WHERE project_id = ? AND key = ?").get(projectId, key) as Row | undefined;
  const title = opts.title?.trim().slice(0, 160) || null;
  if (cur) {
    db()
      .prepare("UPDATE pages SET title = COALESCE(?, title), last_visited_at = CASE WHEN ? THEN ? ELSE last_visited_at END WHERE id = ?")
      .run(title, opts.visited ? 1 : 0, ts, cur.id as string);
    return cur.id as string;
  }
  const id = nanoid(10);
  db()
    .prepare("INSERT INTO pages (id, project_id, key, url, title, created_at, last_visited_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, projectId, key, url, title, ts, opts.visited ? ts : null);
  return id;
}

/** All pages of a project with live issue stats. Pages that only exist through issues are registered on the fly. */
export function listPages(projectId: string): Page[] {
  const project = getProject(projectId);
  if (!project) return [];
  // Read-only on the hot path: only insert pages that don't exist yet (this runs on every poll).
  const known = new Set((db().prepare("SELECT key FROM pages WHERE project_id = ?").all(projectId) as Row[]).map((r) => r.key as string));
  const ensure = (url: string) => {
    const k = pageKey(url);
    if (!known.has(k)) {
      upsertPage(projectId, url);
      known.add(k);
    }
  };
  ensure(project.baseUrl);
  const issues = listIssues({ projectId });
  for (const i of issues) ensure(i.pageUrl);
  const stats = new Map<string, { total: number; open: number; resolved: number }>();
  for (const i of issues) {
    const k = pageKey(i.pageUrl);
    const s = stats.get(k) ?? { total: 0, open: 0, resolved: 0 };
    s.total++;
    if (OPEN_STATUSES.includes(i.status)) s.open++;
    else if (i.status !== "wont_fix") s.resolved++;
    stats.set(k, s);
  }
  const baseKey = pageKey(project.baseUrl);
  return (db().prepare("SELECT * FROM pages WHERE project_id = ? ORDER BY created_at ASC").all(projectId) as Row[])
    .map((r) => {
      const p = toPageRow(r);
      const s = stats.get(p.key) ?? { total: 0, open: 0, resolved: 0 };
      return { ...p, ...s, state: pageState(p.qaStatus, s.total, s.open) };
    })
    .sort((a, b) => (a.key === baseKey ? -1 : b.key === baseKey ? 1 : 0));
}

export function getPage(id: string) {
  const r = db().prepare("SELECT * FROM pages WHERE id = ?").get(id) as Row | undefined;
  return r ? toPageRow(r) : null;
}

export function setPageQa(id: string, done: boolean, actor: string) {
  db()
    .prepare("UPDATE pages SET qa_status = ?, qa_by = ?, qa_at = ? WHERE id = ?")
    .run(done ? "done" : "pending", done ? actor : null, done ? now() : null, id);
}

/** New or reopened work on a signed-off page puts it back in review. */
export function resetPageQa(projectId: string, url: string) {
  db().prepare("UPDATE pages SET qa_status = 'pending', qa_by = NULL, qa_at = NULL WHERE project_id = ? AND key = ? AND qa_status = 'done'").run(projectId, pageKey(url));
}

export function deletePage(id: string): { ok: boolean; reason?: string } {
  const p = getPage(id);
  if (!p) return { ok: false, reason: "Not found" };
  const project = getProject(p.projectId);
  if (project && pageKey(project.baseUrl) === p.key) return { ok: false, reason: "The project's start page can't be removed" };
  const hasIssues = listIssues({ projectId: p.projectId }).some((i) => pageKey(i.pageUrl) === p.key);
  if (hasIssues) return { ok: false, reason: "This page has issues. Resolve or delete them first." };
  db().prepare("DELETE FROM pages WHERE id = ?").run(id);
  return { ok: true };
}

export function pageCoverage(projectId: string) {
  const pages = listPages(projectId);
  return { pages: pages.length, passed: pages.filter((p) => p.state === "passed").length };
}

/* ───────── reply editing ───────── */
export function getComment(id: string): Comment | null {
  const r = db().prepare("SELECT * FROM comments WHERE id = ?").get(id) as Row | undefined;
  return r ? toComment(r) : null;
}

export function updateComment(id: string, body: string): Comment | null {
  db().prepare("UPDATE comments SET body = ?, edited_at = ? WHERE id = ?").run(body, now(), id);
  return getComment(id);
}

export function deleteComment(id: string) {
  db().prepare("DELETE FROM comments WHERE id = ?").run(id);
}
