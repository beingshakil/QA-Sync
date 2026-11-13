import "server-only";
import { nanoid } from "nanoid";
import { LEGACY_WORKSPACE_ID, q, q1, run, type Row } from "./db";
import { pageKey } from "@/lib/utils";
import { OPEN_STATUSES, pageState } from "@/lib/types";
import { isMainAdmin } from "./admin";
import { ADMIN_PLAN, FEATURE_LABEL, PLAN_LIMITS, effectivePlan, hasFeature, usageState, type Feature, type Metered, type PlanAccess, type PlanId, type Usage, type WorkspacePlan } from "@/lib/plans";
import type { Activity, Attachment, Audit, Comment, Design, Issue, Member, Page, Priority, Project, ShareLink, Status, Workspace } from "@/lib/types";

const now = () => new Date().toISOString();
const parse = <T>(v: unknown): T | null => (typeof v === "string" && v ? (JSON.parse(v) as T) : null);
const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

/* ───────── mappers ───────── */
function toProject(r: Row): Project {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    name: r.name as string,
    type: r.type as Project["type"],
    baseUrl: r.base_url as string,
    figmaUrl: (r.figma_url as string) ?? null,
    color: r.color as string,
    createdAt: r.created_at as string,
    issueCount: num(r.issue_count),
    openCount: num(r.open_count),
  };
}

function toIssue(r: Row): Issue {
  return {
    id: r.id as string,
    number: Number(r.number),
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
    xPct: Number(r.x_pct),
    yPct: Number(r.y_pct),
    viewportW: Number(r.viewport_w),
    device: r.device as string,
    element: parse(r.element),
    env: parse(r.env),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    resolvedAt: (r.resolved_at as string) ?? null,
    verifiedAt: (r.verified_at as string) ?? null,
    editedAt: (r.edited_at as string) ?? null,
    attachments: parse<Attachment[]>(r.attachments) ?? [],
    commentCount: num(r.comment_count),
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

/* ───────── users & workspaces ───────── */
export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
}
const toUser = (r: Row): User => ({ id: r.id as string, email: r.email as string, name: r.name as string, image: (r.image as string) ?? null });

export async function getUser(id: string): Promise<User | null> {
  const r = await q1("SELECT * FROM users WHERE id = ?", id);
  return r ? toUser(r) : null;
}

/**
 * Called on every sign-in. Creates the user on first visit, joins any workspaces they were
 * invited to, and gives them their own workspace when they have none.
 */
export async function upsertUser(input: { email: string; name?: string | null; image?: string | null }): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const existing = await q1("SELECT * FROM users WHERE email = ?", email);
  let user: User;
  if (existing) {
    user = toUser(existing);
    if (input.image) user.image = input.image;
    await run("UPDATE users SET image = COALESCE(?, image), last_login_at = ?, login_count = login_count + 1 WHERE id = ?", input.image ?? null, now(), user.id);
  } else {
    user = { id: nanoid(12), email, name: (input.name?.trim() || email.split("@")[0]).slice(0, 60), image: input.image ?? null };
    const ts = now();
    await run("INSERT INTO users (id, email, name, image, created_at, last_login_at, login_count) VALUES (?,?,?,?,?,?,1)", user.id, user.email, user.name, user.image, ts, ts);
  }
  await acceptInvites(user);
  const memberships = await q("SELECT workspace_id FROM memberships WHERE user_id = ?", user.id);
  if (!memberships.length) {
    // Local only: the first person to sign in claims the data imported from the old single-user app.
    const legacy = await q1("SELECT id FROM workspaces WHERE id = ? AND owner_id IS NULL", LEGACY_WORKSPACE_ID);
    if (legacy) {
      await run("UPDATE workspaces SET owner_id = ? WHERE id = ?", user.id, LEGACY_WORKSPACE_ID);
      await run("INSERT INTO memberships (workspace_id, user_id, role, created_at) VALUES (?,?,'owner',?)", LEGACY_WORKSPACE_ID, user.id, now());
    } else {
      await createWorkspace(user, `${user.name.split(" ")[0]}'s workspace`);
    }
  }
  return user;
}

async function acceptInvites(user: User) {
  const invites = await q("SELECT workspace_id FROM invites WHERE email = ?", user.email);
  for (const inv of invites) {
    await run("INSERT INTO memberships (workspace_id, user_id, role, created_at) VALUES (?,?,'member',?) ON CONFLICT DO NOTHING", inv.workspace_id, user.id, now());
  }
  if (invites.length) await run("DELETE FROM invites WHERE email = ?", user.email);
}

export async function createWorkspace(owner: User, name: string): Promise<string> {
  const id = nanoid(10);
  await run("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?,?,?,?)", id, name.slice(0, 60), owner.id, now());
  await run("INSERT INTO memberships (workspace_id, user_id, role, created_at) VALUES (?,?,'owner',?)", id, owner.id, now());
  return id;
}

/** The workspaces a user belongs to, oldest first. */
export async function listUserWorkspaces(userId: string): Promise<{ id: string; name: string; role: Member["role"] }[]> {
  // An invite accepted while signed in (rather than at sign-in) is picked up here too.
  const u = await getUser(userId);
  if (u) await acceptInvites(u);
  return (
    await q(
      `SELECT w.id, w.name, m.role FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
       WHERE m.user_id = ? ORDER BY m.created_at ASC`,
      userId,
    )
  ).map((r) => ({ id: r.id as string, name: r.name as string, role: r.role as Member["role"] }));
}

export async function getWorkspace(workspaceId: string, userId: string): Promise<Workspace | null> {
  const ws = await q1("SELECT * FROM workspaces WHERE id = ?", workspaceId);
  if (!ws) return null;
  const rows = await q(
    `SELECT u.id, u.name, u.email, u.image, m.role FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = ? ORDER BY m.created_at ASC`,
    workspaceId,
  );
  const memberList: Member[] = rows.map((r) => ({
    userId: r.id as string,
    name: r.name as string,
    email: r.email as string,
    image: (r.image as string) ?? null,
    role: r.role as Member["role"],
  }));
  const me = memberList.find((m) => m.userId === userId);
  if (!me) return null;
  const invites = (await q("SELECT email, created_at FROM invites WHERE workspace_id = ? ORDER BY created_at ASC", workspaceId)).map((r) => ({
    email: r.email as string,
    createdAt: r.created_at as string,
  }));
  return {
    id: workspaceId,
    name: ws.name as string,
    userName: me.name,
    userEmail: me.email,
    userImage: me.image,
    role: me.role,
    members: memberList.map((m) => m.name),
    memberList,
    invites,
  };
}

export async function isMemberName(workspaceId: string, name: string | null | undefined): Promise<boolean> {
  if (!name) return false;
  return !!(await q1("SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? AND u.name = ?", workspaceId, name));
}

export async function renameWorkspace(workspaceId: string, name: string) {
  await run("UPDATE workspaces SET name = ? WHERE id = ?", name.trim().slice(0, 60), workspaceId);
}

/** Change your display name; your past comments and issues in this workspace follow it. */
export async function renameUser(userId: string, workspaceId: string, newName: string) {
  const u = await getUser(userId);
  const name = newName.trim().slice(0, 60);
  if (!u || !name || name === u.name) return;
  await run("UPDATE users SET name = ? WHERE id = ?", name, userId);
  const inWs = "project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";
  await run(`UPDATE issues SET reporter_name = ? WHERE reporter_name = ? AND reporter_type = 'member' AND ${inWs}`, name, u.name, workspaceId);
  await run(`UPDATE issues SET assignee = ? WHERE assignee = ? AND ${inWs}`, name, u.name, workspaceId);
  await run(
    `UPDATE comments SET author = ? WHERE author = ? AND author_type = 'member' AND issue_id IN (SELECT i.id FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = ?)`,
    name,
    u.name,
    workspaceId,
  );
  await run(
    `UPDATE activity SET actor = ? WHERE actor = ? AND issue_id IN (SELECT i.id FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = ?)`,
    name,
    u.name,
    workspaceId,
  );
}

export async function inviteMember(workspaceId: string, email: string, invitedBy: string) {
  const e = email.trim().toLowerCase();
  const member = await q1("SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? AND u.email = ?", workspaceId, e);
  if (member) return { ok: false as const, reason: "Already a member of this workspace" };
  await run("INSERT INTO invites (workspace_id, email, invited_by, created_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING", workspaceId, e, invitedBy, now());
  return { ok: true as const };
}

export async function cancelInvite(workspaceId: string, email: string) {
  await run("DELETE FROM invites WHERE workspace_id = ? AND email = ?", workspaceId, email.trim().toLowerCase());
}

export async function removeMember(workspaceId: string, userId: string) {
  await run("DELETE FROM memberships WHERE workspace_id = ? AND user_id = ? AND role <> 'owner'", workspaceId, userId);
}

/* ───────── projects ───────── */
const PROJECT_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*)::int FROM issues i WHERE i.project_id = p.id) AS issue_count,
    (SELECT COUNT(*)::int FROM issues i WHERE i.project_id = p.id AND i.status NOT IN ('verified','wont_fix','fixed')) AS open_count
  FROM projects p`;

export async function listProjects(workspaceId: string): Promise<Project[]> {
  return (await q(`${PROJECT_SELECT} WHERE p.workspace_id = ? ORDER BY p.created_at DESC`, workspaceId)).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const r = await q1(`${PROJECT_SELECT} WHERE p.id = ?`, id);
  return r ? toProject(r) : null;
}

const PROJECT_COLORS = ["#2b5ebe", "#7b2fb0", "#5f8ad0", "#a974cc", "#1f4c9c", "#5e1d95"];

export async function createProject(workspaceId: string, input: { name: string; baseUrl: string; type?: Project["type"]; figmaUrl?: string | null }): Promise<Project> {
  const id = nanoid(10);
  const count = Number((await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM projects WHERE workspace_id = ?", workspaceId))?.n ?? 0);
  await run(
    "INSERT INTO projects (id, workspace_id, name, type, base_url, figma_url, color, created_at) VALUES (?,?,?,?,?,?,?,?)",
    id,
    workspaceId,
    input.name,
    input.type ?? "website",
    input.baseUrl,
    input.figmaUrl ?? null,
    PROJECT_COLORS[count % PROJECT_COLORS.length],
    now(),
  );
  return (await getProject(id))!;
}

export async function updateProject(id: string, patch: Partial<Pick<Project, "name" | "baseUrl" | "figmaUrl">>): Promise<Project | null> {
  const cur = await getProject(id);
  if (!cur) return null;
  await run("UPDATE projects SET name = ?, base_url = ?, figma_url = ? WHERE id = ?", patch.name ?? cur.name, patch.baseUrl ?? cur.baseUrl, patch.figmaUrl ?? cur.figmaUrl, id);
  return getProject(id);
}

export async function deleteProject(id: string) {
  await run("DELETE FROM projects WHERE id = ?", id);
}

/* ───────── issues ───────── */
export interface IssueFilter {
  workspaceId?: string;
  projectId?: string;
  status?: Status | "active";
  pageUrl?: string;
  assignee?: string;
  q?: string;
}

const ISSUE_SELECT = `
  SELECT i.*, p.name AS project_name, p.workspace_id,
    (SELECT COUNT(*)::int FROM comments c WHERE c.issue_id = i.id) AS comment_count
  FROM issues i JOIN projects p ON p.id = i.project_id`;

export async function listIssues(f: IssueFilter = {}): Promise<Issue[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (f.workspaceId) { where.push("p.workspace_id = ?"); args.push(f.workspaceId); }
  if (f.projectId) { where.push("i.project_id = ?"); args.push(f.projectId); }
  if (f.status === "active") where.push("i.status NOT IN ('verified','wont_fix')");
  else if (f.status) { where.push("i.status = ?"); args.push(f.status); }
  if (f.pageUrl) { where.push("i.page_url = ?"); args.push(f.pageUrl); }
  if (f.assignee) { where.push("i.assignee = ?"); args.push(f.assignee); }
  if (f.q) { where.push("(i.title ILIKE ? OR i.body ILIKE ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }
  return (await q(`${ISSUE_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY i.created_at DESC`, ...args)).map(toIssue);
}

/** An issue with the id of the workspace it belongs to. */
export async function getIssue(id: string): Promise<(Issue & { workspaceId: string }) | null> {
  const r = await q1(`${ISSUE_SELECT} WHERE i.id = ?`, id);
  return r ? { ...toIssue(r), workspaceId: r.workspace_id as string } : null;
}

export type NewIssue = Pick<Issue, "projectId" | "pageUrl" | "title" | "reporterName"> &
  Partial<Pick<Issue, "body" | "priority" | "assignee" | "reporterType" | "selector" | "xPct" | "yPct" | "viewportW" | "device" | "element" | "env" | "status" | "createdAt" | "attachments">>;

export async function createIssue(input: NewIssue): Promise<Issue> {
  const id = nanoid(12);
  const ts = input.createdAt ?? now();
  // The issue number is taken in the same statement, so two pins at once can't share a number.
  await run(
    `INSERT INTO issues (id, number, project_id, page_url, title, body, status, priority, assignee, reporter_name, reporter_type,
       selector, x_pct, y_pct, viewport_w, device, element, env, created_at, updated_at, attachments)
     SELECT ?, COALESCE(MAX(number), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::float8, ?::float8, ?::int, ?, ?, ?, ?, ?, ? FROM issues WHERE project_id = ?`,
    id,
    input.projectId,
    input.pageUrl,
    input.title,
    input.body ?? "",
    input.status ?? "open",
    input.priority ?? "medium",
    input.assignee ?? null,
    input.reporterName,
    input.reporterType ?? "member",
    input.selector ?? null,
    input.xPct ?? 0,
    input.yPct ?? 0,
    input.viewportW ?? 1280,
    input.device ?? "desktop",
    input.element ? JSON.stringify(input.element) : null,
    input.env ? JSON.stringify(input.env) : null,
    ts,
    ts,
    input.attachments?.length ? JSON.stringify(input.attachments) : null,
    input.projectId,
  );
  await logActivity(id, "created", null, null, input.reporterName, ts);
  return (await getIssue(id))!;
}

export async function updateIssue(
  id: string,
  patch: Partial<Pick<Issue, "status" | "priority" | "assignee" | "title" | "body">>,
  actor: string,
): Promise<Issue | null> {
  const cur = await getIssue(id);
  if (!cur) return null;
  const ts = now();
  const next = { ...cur, ...patch };
  let resolvedAt = cur.resolvedAt;
  let verifiedAt = cur.verifiedAt;
  if (patch.status && patch.status !== cur.status) {
    await logActivity(id, "status", cur.status, patch.status, actor, ts);
    if (patch.status === "fixed") resolvedAt = ts;
    if (patch.status === "verified") { verifiedAt = ts; resolvedAt = resolvedAt ?? ts; }
    if (patch.status === "open" || patch.status === "in_progress") { resolvedAt = null; verifiedAt = null; }
  }
  if (patch.priority && patch.priority !== cur.priority) await logActivity(id, "priority", cur.priority, patch.priority, actor, ts);
  if (patch.assignee !== undefined && patch.assignee !== cur.assignee) await logActivity(id, "assignee", cur.assignee, patch.assignee, actor, ts);
  const textEdited = (patch.title !== undefined && patch.title !== cur.title) || (patch.body !== undefined && patch.body !== cur.body);
  await run(
    "UPDATE issues SET status=?, priority=?, assignee=?, title=?, body=?, updated_at=?, resolved_at=?, verified_at=?, edited_at=? WHERE id=?",
    next.status,
    next.priority,
    next.assignee,
    next.title,
    next.body,
    ts,
    resolvedAt,
    verifiedAt,
    textEdited ? ts : (cur.editedAt ?? null),
    id,
  );
  return getIssue(id);
}

export async function deleteIssue(id: string) {
  await run("DELETE FROM issues WHERE id = ?", id);
}

/* ───────── comments & activity ───────── */
export async function listComments(issueId: string): Promise<Comment[]> {
  return (await q("SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC", issueId)).map(toComment);
}

export async function addComment(input: { issueId: string; author: string; authorType?: Comment["authorType"]; body: string; createdAt?: string }): Promise<Comment> {
  const id = nanoid(12);
  const ts = input.createdAt ?? now();
  await run("INSERT INTO comments (id, issue_id, author, author_type, body, created_at) VALUES (?,?,?,?,?,?)", id, input.issueId, input.author, input.authorType ?? "member", input.body, ts);
  await run("UPDATE issues SET updated_at = ? WHERE id = ?", ts, input.issueId);
  await logActivity(input.issueId, "comment", null, null, input.author, ts);
  return toComment((await q1("SELECT * FROM comments WHERE id = ?", id))!);
}

export async function logActivity(issueId: string, type: Activity["type"], fromVal: string | null, toVal: string | null, actor: string, ts = now()) {
  await run("INSERT INTO activity (id, issue_id, type, from_val, to_val, actor, created_at) VALUES (?,?,?,?,?,?,?)", nanoid(12), issueId, type, fromVal, toVal, actor, ts);
}

export async function listActivity(issueId: string): Promise<Activity[]> {
  return (await q("SELECT * FROM activity WHERE issue_id = ? ORDER BY created_at ASC", issueId)).map(toActivity);
}

/* ───────── share links ───────── */
export async function createShare(projectId: string, role: ShareLink["role"] = "comment"): Promise<ShareLink> {
  const token = nanoid(21);
  const ts = now();
  await run("INSERT INTO share_links (token, project_id, role, created_at) VALUES (?,?,?,?)", token, projectId, role, ts);
  return { token, projectId, role, createdAt: ts };
}

export async function getShare(token: string): Promise<ShareLink | null> {
  const r = await q1("SELECT * FROM share_links WHERE token = ?", token);
  return r ? { token: r.token as string, projectId: r.project_id as string, role: r.role as ShareLink["role"], createdAt: r.created_at as string } : null;
}

export async function getOrCreateShare(projectId: string): Promise<ShareLink> {
  const r = await q1("SELECT token FROM share_links WHERE project_id = ? ORDER BY created_at ASC LIMIT 1", projectId);
  return r ? (await getShare(r.token as string))! : createShare(projectId);
}

/* ───────── audits ───────── */
export async function saveAudit(a: Omit<Audit, "id" | "createdAt">): Promise<Audit> {
  const id = nanoid(10);
  const ts = now();
  await run(
    "INSERT INTO audits (id, project_id, url, score, findings, stats, seo, created_at) VALUES (?,?,?,?,?,?,?,?)",
    id,
    a.projectId,
    a.url,
    a.score,
    JSON.stringify(a.findings),
    JSON.stringify(a.stats),
    a.seo ? JSON.stringify(a.seo) : null,
    ts,
  );
  return { ...a, id, createdAt: ts };
}

/** A project's audits, or (with workspaceId) the 50 newest across the workspace. */
export async function listAudits(scope: { projectId: string } | { workspaceId: string }): Promise<Audit[]> {
  const rows =
    "projectId" in scope
      ? await q("SELECT * FROM audits WHERE project_id = ? ORDER BY created_at DESC", scope.projectId)
      : await q("SELECT a.* FROM audits a JOIN projects p ON p.id = a.project_id WHERE p.workspace_id = ? ORDER BY a.created_at DESC LIMIT 50", scope.workspaceId);
  return rows.map(toAudit);
}

export async function deleteAudit(id: string): Promise<boolean> {
  return (await run("DELETE FROM audits WHERE id = ?", id)) > 0;
}

export async function getAudit(id: string): Promise<Audit | null> {
  const r = await q1("SELECT * FROM audits WHERE id = ?", id);
  return r ? toAudit(r) : null;
}

function toAudit(r: Row): Audit {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    url: r.url as string,
    score: Number(r.score),
    findings: JSON.parse(r.findings as string),
    stats: JSON.parse(r.stats as string),
    seo: r.seo ? JSON.parse(r.seo as string) : null,
    createdAt: r.created_at as string,
  };
}

/* ───────── uploads & design references ───────── */
export async function saveUpload(u: { id: string; file: string; mime: string; name: string; size: number }): Promise<Attachment> {
  await run("INSERT INTO uploads (id, file, mime, name, size, created_at) VALUES (?,?,?,?,?,?)", u.id, u.file, u.mime, u.name, u.size, now());
  return { id: u.id, url: `/api/uploads/${u.id}`, mime: u.mime, name: u.name, size: u.size };
}

export async function getUpload(id: string): Promise<{ file: string; mime: string; name: string; size: number } | null> {
  const r = await q1("SELECT file, mime, name, size FROM uploads WHERE id = ?", id);
  return r ? { file: r.file as string, mime: r.mime as string, name: r.name as string, size: Number(r.size) } : null;
}

const toDesign = (r: Row): Design => ({
  id: r.id as string,
  projectId: r.project_id as string,
  pageUrl: r.page_url as string,
  device: r.device as string,
  url: `/api/uploads/${r.upload_id as string}`,
  createdAt: r.created_at as string,
});

export async function listDesigns(projectId: string, pageUrl?: string): Promise<Design[]> {
  const rows = pageUrl
    ? await q("SELECT * FROM designs WHERE project_id = ? AND page_url = ? ORDER BY created_at DESC", projectId, pageUrl)
    : await q("SELECT * FROM designs WHERE project_id = ? ORDER BY created_at DESC", projectId);
  return rows.map(toDesign);
}

export async function getDesign(id: string): Promise<Design | null> {
  const r = await q1("SELECT * FROM designs WHERE id = ?", id);
  return r ? toDesign(r) : null;
}

export async function addDesign(projectId: string, pageUrl: string, device: string, uploadId: string): Promise<Design> {
  const id = nanoid(10);
  // One reference per page + device: replace the previous one.
  await run("DELETE FROM designs WHERE project_id = ? AND page_url = ? AND device = ?", projectId, pageUrl, device);
  await run("INSERT INTO designs (id, project_id, page_url, device, upload_id, created_at) VALUES (?,?,?,?,?,?)", id, projectId, pageUrl, device, uploadId, now());
  return (await listDesigns(projectId, pageUrl)).find((d) => d.id === id)!;
}

export async function deleteDesign(id: string) {
  await run("DELETE FROM designs WHERE id = ?", id);
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
export async function upsertPage(projectId: string, url: string, opts: { title?: string | null; visited?: boolean } = {}): Promise<string> {
  const key = pageKey(url);
  const ts = now();
  const title = opts.title?.trim().slice(0, 160) || null;
  const cur = await q1("SELECT id FROM pages WHERE project_id = ? AND key = ?", projectId, key);
  if (cur) {
    if (title || opts.visited) {
      await run(
        "UPDATE pages SET title = COALESCE(?, title), last_visited_at = COALESCE(?, last_visited_at) WHERE id = ?",
        title,
        opts.visited ? ts : null,
        cur.id as string,
      );
    }
    return cur.id as string;
  }
  const id = nanoid(10);
  await run(
    "INSERT INTO pages (id, project_id, key, url, title, created_at, last_visited_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT (project_id, key) DO NOTHING",
    id,
    projectId,
    key,
    url,
    title,
    ts,
    opts.visited ? ts : null,
  );
  return ((await q1("SELECT id FROM pages WHERE project_id = ? AND key = ?", projectId, key))?.id as string) ?? id;
}

/** All pages of a project with live issue stats. Pages that only exist through issues are registered on the fly. */
export async function listPages(projectId: string): Promise<Page[]> {
  const project = await getProject(projectId);
  if (!project) return [];
  const known = new Set((await q("SELECT key FROM pages WHERE project_id = ?", projectId)).map((r) => r.key as string));
  const ensure = async (url: string) => {
    const k = pageKey(url);
    if (!known.has(k)) {
      await upsertPage(projectId, url);
      known.add(k);
    }
  };
  await ensure(project.baseUrl);
  const issues = await listIssues({ projectId });
  for (const i of issues) await ensure(i.pageUrl);
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
  return (await q("SELECT * FROM pages WHERE project_id = ? ORDER BY created_at ASC", projectId))
    .map((r) => {
      const p = toPageRow(r);
      const s = stats.get(p.key) ?? { total: 0, open: 0, resolved: 0 };
      return { ...p, ...s, state: pageState(p.qaStatus, s.total, s.open) };
    })
    .sort((a, b) => (a.key === baseKey ? -1 : b.key === baseKey ? 1 : 0));
}

export async function getPage(id: string) {
  const r = await q1("SELECT * FROM pages WHERE id = ?", id);
  return r ? toPageRow(r) : null;
}

export async function setPageQa(id: string, done: boolean, actor: string) {
  await run("UPDATE pages SET qa_status = ?, qa_by = ?, qa_at = ? WHERE id = ?", done ? "done" : "pending", done ? actor : null, done ? now() : null, id);
}

/** New or reopened work on a signed-off page puts it back in review. */
export async function resetPageQa(projectId: string, url: string) {
  await run("UPDATE pages SET qa_status = 'pending', qa_by = NULL, qa_at = NULL WHERE project_id = ? AND key = ? AND qa_status = 'done'", projectId, pageKey(url));
}

export async function deletePage(id: string): Promise<{ ok: boolean; reason?: string }> {
  const p = await getPage(id);
  if (!p) return { ok: false, reason: "Not found" };
  const project = await getProject(p.projectId);
  if (project && pageKey(project.baseUrl) === p.key) return { ok: false, reason: "The project's start page can't be removed" };
  const hasIssues = (await listIssues({ projectId: p.projectId })).some((i) => pageKey(i.pageUrl) === p.key);
  if (hasIssues) return { ok: false, reason: "This page has issues. Resolve or delete them first." };
  await run("DELETE FROM pages WHERE id = ?", id);
  return { ok: true };
}

/* ───────── reply editing ───────── */
export async function getComment(id: string): Promise<Comment | null> {
  const r = await q1("SELECT * FROM comments WHERE id = ?", id);
  return r ? toComment(r) : null;
}

export async function updateComment(id: string, body: string): Promise<Comment | null> {
  await run("UPDATE comments SET body = ?, edited_at = ? WHERE id = ?", body, now(), id);
  return getComment(id);
}

export async function deleteComment(id: string) {
  await run("DELETE FROM comments WHERE id = ?", id);
}

/* ───────── plans & limits ───────── */
export async function getWorkspacePlan(workspaceId: string): Promise<WorkspacePlan> {
  const r = await q1(
    `SELECT w.plan, w.plan_expires_at, u.email AS owner_email,
            EXISTS (SELECT 1 FROM site_admins sa WHERE sa.email = lower(u.email)) AS owner_admin
     FROM workspaces w LEFT JOIN users u ON u.id = w.owner_id WHERE w.id = ?`,
    workspaceId,
  );
  if (isMainAdmin(r?.owner_email as string | null) || r?.owner_admin) return ADMIN_PLAN;
  return effectivePlan(r?.plan as string, r?.plan_expires_at as string | null);
}

/** Everything a plan limits, counted for one workspace. Comments = pins + replies; members include pending invites. */
export async function workspaceUsage(workspaceId: string): Promise<Usage> {
  const r = await q1<Record<Metered, number>>(
    `SELECT
       (SELECT COUNT(*)::int FROM projects WHERE workspace_id = ?) AS projects,
       (SELECT COUNT(*)::int FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = ?)
       + (SELECT COUNT(*)::int FROM comments c JOIN issues i ON i.id = c.issue_id JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = ?) AS comments,
       (SELECT COUNT(*)::int FROM audits a JOIN projects p ON p.id = a.project_id WHERE p.workspace_id = ?) AS audits,
       (SELECT COUNT(*)::int FROM memberships WHERE workspace_id = ?) + (SELECT COUNT(*)::int FROM invites WHERE workspace_id = ?) AS members`,
    workspaceId,
    workspaceId,
    workspaceId,
    workspaceId,
    workspaceId,
    workspaceId,
  );
  return { projects: Number(r?.projects ?? 0), comments: Number(r?.comments ?? 0), audits: Number(r?.audits ?? 0), members: Number(r?.members ?? 0) };
}

const LIMIT_MESSAGE: Record<Metered, (n: number) => string> = {
  projects: (n) => `The Free plan includes ${n} projects. Upgrade to Pro for unlimited projects, or delete one you no longer need.`,
  comments: (n) => `You've used all ${n} comments on the Free plan. Upgrade to Pro to keep commenting.`,
  audits: (n) => `The Free plan includes ${n} page audits. Upgrade to Pro for unlimited audits, or delete an old report.`,
  members: (n) => `The Free plan includes ${n} team members, counting you and pending invites. Upgrade to Pro to invite more people.`,
};

/** Null when there's room for one more, otherwise the message to show. */
export async function checkLimit(workspaceId: string, what: Metered): Promise<string | null> {
  const [{ plan }, usage] = await Promise.all([getWorkspacePlan(workspaceId), workspaceUsage(workspaceId)]);
  const limit = PLAN_LIMITS[plan][what];
  return usage[what] < limit ? null : LIMIT_MESSAGE[what](limit);
}

/** Null when the workspace has this tool, otherwise the message to show. */
export async function requireFeature(workspaceId: string, f: Feature): Promise<string | null> {
  const { plan } = await getWorkspacePlan(workspaceId);
  return hasFeature(plan, f) ? null : `${FEATURE_LABEL[f]} is a Pro feature. Upgrade to Pro to use it.`;
}

/**
 * Emails a Free workspace's owner once when comments get close to the limit, and once when they run out.
 * Each notice is claimed atomically (plan_notices), so concurrent requests never send it twice.
 */
export async function notifyUsage(workspaceId: string): Promise<void> {
  const [{ plan }, usage] = await Promise.all([getWorkspacePlan(workspaceId), workspaceUsage(workspaceId)]);
  if (plan !== "free") return;
  const limit = PLAN_LIMITS.free.comments;
  const state = usageState(usage.comments, limit);
  if (state === "ok") return;
  const key = `|comments-${state}|`;
  const claimed = await q1(
    `UPDATE workspaces SET plan_notices = plan_notices || ?::text
     WHERE id = ? AND strpos(plan_notices, ?::text) = 0
     RETURNING name, (SELECT u.email FROM users u WHERE u.id = workspaces.owner_id) AS email,
                     (SELECT u.name FROM users u WHERE u.id = workspaces.owner_id) AS owner`,
    key,
    workspaceId,
    key,
  );
  if (!claimed?.email) return;
  const { sendMail, usageEmail } = await import("./mail");
  const mail = usageEmail({ name: claimed.owner as string, workspace: claimed.name as string, used: usage.comments, limit, full: state === "full" });
  await sendMail({ to: claimed.email as string, ...mail }).catch(() => {});
}

/** Sets the plan on every workspace a user owns; returns those workspaces. Usage notices start over. */
export async function setPlanForOwner(userId: string, plan: PlanId, expiresAt: string | null, grantedBy: string): Promise<{ id: string; name: string }[]> {
  const rows = await q(
    `UPDATE workspaces SET plan = ?, plan_expires_at = ?, plan_updated_at = ?, plan_granted_by = ?, plan_notices = ''
     WHERE owner_id = ? RETURNING id, name`,
    plan,
    plan === "pro" ? expiresAt : null,
    now(),
    grantedBy,
    userId,
  );
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
}

export async function planAccess(workspaceId: string): Promise<PlanAccess> {
  const [{ plan }, usage] = await Promise.all([getWorkspacePlan(workspaceId), workspaceUsage(workspaceId)]);
  const limit = PLAN_LIMITS[plan].comments;
  return { pro: plan === "pro", comments: { used: usage.comments, limit: Number.isFinite(limit) ? limit : null } };
}
