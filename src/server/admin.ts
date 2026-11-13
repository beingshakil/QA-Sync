import "server-only";
import { q, q1, run } from "./db";
import { ADMIN_PLAN, effectivePlan, type WorkspacePlan } from "@/lib/plans";

const norm = (email: string) => email.trim().toLowerCase();

/** Main admins: the Google emails in QASYNC_ADMIN_EMAILS (comma-separated), kept out of the code. */
export function mainAdminEmails(): string[] {
  return (process.env.QASYNC_ADMIN_EMAILS ?? "").split(",").map(norm).filter(Boolean);
}

/** Main admins can do everything, including adding and removing other admins. */
export function isMainAdmin(email: string | null | undefined): boolean {
  return !!email && mainAdminEmails().includes(norm(email));
}

/**
 * Site admins: the main admins, plus anyone a main admin added from the admin page (site_admins).
 * Admins can open /app/admin and give or remove Pro; their own workspaces are always Pro.
 */
export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (isMainAdmin(email)) return true;
  return !!(await q1("SELECT 1 FROM site_admins WHERE email = ?", norm(email)));
}

export interface SiteAdmin {
  email: string;
  main: boolean;
  name: string | null;
  image: string | null;
  addedBy: string | null;
  createdAt: string | null;
}

export async function listAdmins(): Promise<SiteAdmin[]> {
  const main = mainAdminEmails();
  const added = await q("SELECT email, added_by, created_at FROM site_admins ORDER BY created_at ASC");
  const emails = [...main, ...added.map((r) => r.email as string).filter((e) => !main.includes(e))];
  if (!emails.length) return [];
  const users = await q(`SELECT email, name, image FROM users WHERE lower(email) IN (${emails.map(() => "?").join(",")})`, ...emails);
  const user = (e: string) => users.find((u) => norm(u.email as string) === e);
  return emails.map((e) => {
    const a = added.find((r) => r.email === e);
    return {
      email: e,
      main: main.includes(e),
      name: (user(e)?.name as string) ?? null,
      image: (user(e)?.image as string) ?? null,
      addedBy: (a?.added_by as string) ?? null,
      createdAt: (a?.created_at as string) ?? null,
    };
  });
}

export async function addAdmin(email: string, addedBy: string) {
  await run("INSERT INTO site_admins (email, added_by, created_at) VALUES (?,?,?) ON CONFLICT (email) DO NOTHING", norm(email), addedBy, new Date().toISOString());
}

export async function removeAdmin(email: string) {
  await run("DELETE FROM site_admins WHERE email = ?", norm(email));
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  workspaces: string;
  projects: number;
  issues: number;
  /** Plan of the workspace(s) they own; null when they own none (invited members only). */
  plan: WorkspacePlan | null;
  /** "main" (QASYNC_ADMIN_EMAILS), "admin" (added from the admin page) or null. */
  adminRole: "main" | "admin" | null;
}

export async function adminStats() {
  const r = await q1<Record<string, number>>(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= ?) AS new7,
      (SELECT COUNT(*)::int FROM users WHERE last_login_at >= ?) AS active7,
      (SELECT COUNT(*)::int FROM workspaces) AS workspaces,
      (SELECT COUNT(*)::int FROM projects) AS projects,
      (SELECT COUNT(*)::int FROM issues) AS issues,
      (SELECT COUNT(*)::int FROM audits) AS audits,
      (SELECT COUNT(*)::int FROM invites) AS invites,
      (SELECT COUNT(*)::int FROM workspaces WHERE plan = 'pro' AND (plan_expires_at IS NULL OR plan_expires_at > ?)) AS pro`,
    daysAgo(7),
    daysAgo(7),
    new Date().toISOString(),
  );
  return r ?? {};
}

export async function adminUsers(): Promise<AdminUser[]> {
  const rows = await q(`
    SELECT u.id, u.name, u.email, u.image, u.created_at, u.last_login_at, u.login_count,
      (SELECT w.plan FROM workspaces w WHERE w.owner_id = u.id ORDER BY w.created_at LIMIT 1) AS plan,
      (SELECT w.plan_expires_at FROM workspaces w WHERE w.owner_id = u.id ORDER BY w.created_at LIMIT 1) AS plan_expires_at,
      (SELECT COUNT(*)::int FROM workspaces w WHERE w.owner_id = u.id) AS owned,
      EXISTS (SELECT 1 FROM site_admins sa WHERE sa.email = lower(u.email)) AS sub_admin,
      COALESCE((SELECT string_agg(w.name || ' (' || m.role || ')', ', ' ORDER BY m.created_at)
                FROM memberships m JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = u.id), '') AS workspaces,
      (SELECT COUNT(*)::int FROM projects p WHERE p.workspace_id IN (SELECT workspace_id FROM memberships WHERE user_id = u.id AND role = 'owner')) AS projects,
      (SELECT COUNT(*)::int FROM issues i WHERE i.reporter_type = 'member' AND i.reporter_name = u.name
         AND i.project_id IN (SELECT p.id FROM projects p JOIN memberships m ON m.workspace_id = p.workspace_id WHERE m.user_id = u.id)) AS issues
    FROM users u
    ORDER BY u.created_at DESC`);
  return rows.map((r) => {
    const adminRole = isMainAdmin(r.email as string) ? "main" : r.sub_admin ? "admin" : null;
    return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    image: (r.image as string) ?? null,
    createdAt: r.created_at as string,
    lastLoginAt: (r.last_login_at as string) ?? null,
    loginCount: Number(r.login_count ?? 0),
    workspaces: r.workspaces as string,
    projects: Number(r.projects ?? 0),
    issues: Number(r.issues ?? 0),
    plan: Number(r.owned ?? 0) > 0 ? (adminRole ? ADMIN_PLAN : effectivePlan(r.plan as string, r.plan_expires_at as string | null)) : null,
    adminRole,
  } as AdminUser;
  });
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
