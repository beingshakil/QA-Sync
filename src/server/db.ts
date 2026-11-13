import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 1 persistence: Node's built-in SQLite.
 * Swap path: replace this module with Drizzle + Postgres; repositories keep the same signatures.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'website',
  base_url TEXT NOT NULL,
  figma_url TEXT,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);
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
  x_pct REAL NOT NULL DEFAULT 0,
  y_pct REAL NOT NULL DEFAULT 0,
  viewport_w INTEGER NOT NULL DEFAULT 1280,
  device TEXT NOT NULL DEFAULT 'desktop',
  element TEXT,
  env TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id, status);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'member',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
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
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  members TEXT NOT NULL
);
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
`;

/** Additive migrations for databases created by earlier versions. */
function migrate(db: DatabaseSync) {
  const cols = (db.prepare("PRAGMA table_info(issues)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("attachments")) db.exec("ALTER TABLE issues ADD COLUMN attachments TEXT");
  if (!cols.includes("edited_at")) db.exec("ALTER TABLE issues ADD COLUMN edited_at TEXT");
  const ccols = (db.prepare("PRAGMA table_info(comments)").all() as { name: string }[]).map((c) => c.name);
  if (!ccols.includes("edited_at")) db.exec("ALTER TABLE comments ADD COLUMN edited_at TEXT");
  const ws = db.prepare("SELECT COUNT(*) AS n FROM workspace").get() as { n: number };
  if (ws.n === 0) {
    db.prepare("INSERT INTO workspace (id, name, user_name, members) VALUES (1, ?, ?, ?)").run("My workspace", "You", JSON.stringify(["You"]));
  }
}

const globalForDb = globalThis as unknown as { __qasyncDb?: DatabaseSync };

function open(): DatabaseSync {
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "qasync.db");
  // The app used to be called Fixproof: carry an existing database (and its WAL files) over.
  const legacy = path.join(dir, "fixproof.db");
  if (!fs.existsSync(file) && fs.existsSync(legacy)) {
    for (const ext of ["", "-wal", "-shm"]) if (fs.existsSync(legacy + ext)) fs.renameSync(legacy + ext, file + ext);
  }
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function db(): DatabaseSync {
  if (!globalForDb.__qasyncDb) globalForDb.__qasyncDb = open();
  return globalForDb.__qasyncDb;
}
