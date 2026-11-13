import "server-only";
import { q, q1 } from "./db";
import { effectivePlan, type WorkspacePlan } from "@/lib/plans";

/**
 * Site admins: the Google emails in QASYNC_ADMIN_EMAILS (comma-separated). Kept out of the code
 * so no address is published; with the variable unset there are no admins and /app/admin is a 404.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.QASYNC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
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
      COALESCE((SELECT string_agg(w.name || ' (' || m.role || ')', ', ' ORDER BY m.created_at)
                FROM memberships m JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = u.id), '') AS workspaces,
      (SELECT COUNT(*)::int FROM projects p WHERE p.workspace_id IN (SELECT workspace_id FROM memberships WHERE user_id = u.id AND role = 'owner')) AS projects,
      (SELECT COUNT(*)::int FROM issues i WHERE i.reporter_type = 'member' AND i.reporter_name = u.name
         AND i.project_id IN (SELECT p.id FROM projects p JOIN memberships m ON m.workspace_id = p.workspace_id WHERE m.user_id = u.id)) AS issues
    FROM users u
    ORDER BY u.created_at DESC`);
  return rows.map((r) => ({
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
    plan: Number(r.owned ?? 0) > 0 ? effectivePlan(r.plan as string, r.plan_expires_at as string | null) : null,
  }));
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
