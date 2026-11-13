import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Postgres everywhere.
 * - Hosted (Vercel), or QASYNC_DB=remote: node-postgres against DATABASE_URL (Neon, pooled).
 * - Local: PGlite, an in-process Postgres stored in .data/pglite, so local testing never
 *   touches production data. Data from the old SQLite file (.data/qasync.db) is imported once.
 *
 * Queries use `?` placeholders (converted to $1, $2…). Timestamps are ISO strings in TEXT columns.
 */

export type Row = Record<string, unknown>;
type Result = { rows: Row[]; affectedRows: number };
interface Driver {
  query(sql: string, params: unknown[]): Promise<Result>;
  exec(sql: string): Promise<void>;
  kind: "pg" | "pglite";
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE TABLE IF NOT EXISTS invites (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'website',
  base_url TEXT NOT NULL,
  figma_url TEXT,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_ws ON projects(workspace_id);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee TEXT,
  reporter_name TEXT NOT NULL,
  reporter_type TEXT NOT NULL DEFAULT 'member',
  selector TEXT,
  x_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  y_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  viewport_w INTEGER NOT NULL DEFAULT 1280,
  device TEXT NOT NULL DEFAULT 'desktop',
  element TEXT,
  env TEXT,
  attachments TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  verified_at TEXT,
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id, status);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'member',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments(issue_id);
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_val TEXT,
  to_val TEXT,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_issue ON activity(issue_id);
CREATE TABLE IF NOT EXISTS share_links (
  token TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'comment',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score INTEGER NOT NULL,
  findings TEXT NOT NULL,
  stats TEXT NOT NULL,
  seo TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audits_project ON audits(project_id);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  file TEXT NOT NULL,
  mime TEXT NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'desktop',
  upload_id TEXT NOT NULL REFERENCES uploads(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_designs_page ON designs(project_id, page_url);
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  qa_status TEXT NOT NULL DEFAULT 'pending',
  qa_by TEXT,
  qa_at TEXT,
  created_at TEXT NOT NULL,
  last_visited_at TEXT,
  UNIQUE (project_id, key)
);
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/** `?` → `$1, $2…` (our SQL never has a literal `?`; user text always goes in as a parameter). */
function toPg(sql: string) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

const hosted = () => !!process.env.VERCEL || process.env.QASYNC_DB === "remote";

async function openPg(): Promise<Driver> {
  const { Pool } = await import("pg");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
  return {
    kind: "pg",
    async query(sql, params) {
      const r = await pool.query(toPg(sql), params);
      return { rows: r.rows as Row[], affectedRows: r.rowCount ?? 0 };
    },
    async exec(sql) {
      await pool.query(sql);
    },
  };
}

async function openPglite(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir);
  return {
    kind: "pglite",
    async query(sql, params) {
      const r = await db.query<Row>(toPg(sql), params);
      return { rows: r.rows, affectedRows: r.affectedRows ?? 0 };
    },
    async exec(sql) {
      await db.exec(sql);
    },
  };
}

async function open(): Promise<Driver> {
  const d = hosted() ? await openPg() : await openPglite();
  // One transaction with an advisory lock, so two cold starts can't create the schema at once.
  await d.exec(`BEGIN; SELECT pg_advisory_xact_lock(733101); ${SCHEMA} COMMIT;`);
  if (d.kind === "pglite") await importLegacySqlite(d);
  return d;
}

const g = globalThis as unknown as { __qasyncDriver?: Promise<Driver> };
function driver(): Promise<Driver> {
  if (!g.__qasyncDriver) {
    g.__qasyncDriver = open().catch((e) => {
      g.__qasyncDriver = undefined; // let the next request retry
      throw e;
    });
  }
  return g.__qasyncDriver;
}

/** All rows. */
export async function q<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
  return (await (await driver()).query(sql, params)).rows as T[];
}
/** First row or null. */
export async function q1<T = Row>(sql: string, ...params: unknown[]): Promise<T | null> {
  return ((await q<T>(sql, ...params))[0] ?? null) as T | null;
}
/** Run a write; returns the number of affected rows. */
export async function run(sql: string, ...params: unknown[]): Promise<number> {
  return (await (await driver()).query(sql, params)).affectedRows;
}

/* ───────── one-time import of the old local SQLite database ───────── */

/** Workspace that holds imported data until the first person signs in locally and claims it. */
export const LEGACY_WORKSPACE_ID = "legacy";

async function importLegacySqlite(d: Driver) {
  const file = path.join(process.cwd(), ".data", "qasync.db");
  if (!fs.existsSync(file)) return;
  const done = await d.query("SELECT value FROM meta WHERE key = 'legacy_import'", []);
  if (done.rows.length) return;
  const hasProjects = await d.query("SELECT 1 FROM projects LIMIT 1", []);
  if (hasProjects.rows.length) return;

  const { DatabaseSync } = await import("node:sqlite");
  const old = new DatabaseSync(file, { readOnly: true });
  const all = (sql: string) => old.prepare(sql).all() as Row[];
  const has = (t: string) => !!old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  const now = new Date().toISOString();
  const wsName = (has("workspace") ? (old.prepare("SELECT name FROM workspace WHERE id = 1").get() as Row | undefined)?.name : null) ?? "My workspace";

  await d.exec("BEGIN");
  try {
    await d.query("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES ($1, $2, NULL, $3)", [LEGACY_WORKSPACE_ID, wsName, now]);
    const copy = async (table: string, cols: string[], extra: Record<string, unknown> = {}) => {
      if (!has(table)) return 0;
      const oldCols = new Set((old.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));
      const use = cols.filter((c) => oldCols.has(c));
      const names = [...use, ...Object.keys(extra)];
      let n = 0;
      for (const r of all(`SELECT * FROM ${table}`)) {
        const vals = [...use.map((c) => r[c] ?? null), ...Object.values(extra)];
        await d.query(`INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING`, vals);
        n++;
      }
      return n;
    };
    await copy("projects", ["id", "name", "type", "base_url", "figma_url", "color", "created_at"], { workspace_id: LEGACY_WORKSPACE_ID });
    await copy("issues", ["id", "number", "project_id", "page_url", "title", "body", "status", "priority", "assignee", "reporter_name", "reporter_type", "selector", "x_pct", "y_pct", "viewport_w", "device", "element", "env", "attachments", "created_at", "updated_at", "resolved_at", "verified_at", "edited_at"]);
    await copy("comments", ["id", "issue_id", "author", "author_type", "body", "created_at", "edited_at"]);
    await copy("activity", ["id", "issue_id", "type", "from_val", "to_val", "actor", "created_at"]);
    await copy("share_links", ["token", "project_id", "role", "created_at"]);
    await copy("audits", ["id", "project_id", "url", "score", "findings", "stats", "seo", "created_at"]);
    await copy("uploads", ["id", "file", "mime", "name", "size", "created_at"]);
    await copy("designs", ["id", "project_id", "page_url", "device", "upload_id", "created_at"]);
    await copy("pages", ["id", "project_id", "key", "url", "title", "qa_status", "qa_by", "qa_at", "created_at", "last_visited_at"]);
    await d.query("INSERT INTO meta (key, value) VALUES ('legacy_import', $1)", [now]);
    await d.exec("COMMIT");
  } catch (e) {
    await d.exec("ROLLBACK");
    throw e;
  } finally {
    old.close();
  }
}
