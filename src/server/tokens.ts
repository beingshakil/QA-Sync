import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { db } from "./db";
import type { ApiToken } from "@/lib/types";

/**
 * API tokens for the MCP server (and later the public API).
 * Only a SHA-256 hash is stored; the raw token is shown once, when it's created.
 */

type Row = Record<string, unknown>;
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const toToken = (r: Row): ApiToken => ({
  id: r.id as string,
  name: r.name as string,
  prefix: r.prefix as string,
  createdAt: r.created_at as string,
  lastUsedAt: (r.last_used_at as string | null) ?? null,
});

export function listApiTokens(): ApiToken[] {
  return (db().prepare("SELECT * FROM api_tokens ORDER BY created_at DESC").all() as Row[]).map(toToken);
}

export function createApiToken(name: string): { token: string; record: ApiToken } {
  const token = `qas_${randomBytes(24).toString("base64url")}`;
  const record: ApiToken = { id: nanoid(10), name, prefix: token.slice(0, 8), createdAt: new Date().toISOString(), lastUsedAt: null };
  db()
    .prepare("INSERT INTO api_tokens (id, name, token_hash, prefix, created_at) VALUES (?,?,?,?,?)")
    .run(record.id, record.name, hash(token), record.prefix, record.createdAt);
  return { token, record };
}

export function revokeApiToken(id: string): boolean {
  return Number(db().prepare("DELETE FROM api_tokens WHERE id = ?").run(id).changes) > 0;
}

/** Returns the token's record when the raw token is valid, and stamps when it was last used. */
export function verifyApiToken(raw: string | null | undefined): ApiToken | null {
  if (!raw || !raw.startsWith("qas_")) return null;
  const r = db().prepare("SELECT * FROM api_tokens WHERE token_hash = ?").get(hash(raw)) as Row | undefined;
  if (!r) return null;
  const ts = new Date().toISOString();
  db().prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(ts, r.id as string);
  return { ...toToken(r), lastUsedAt: ts };
}
