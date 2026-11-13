import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { q, q1, run, type Row } from "./db";
import type { ApiToken } from "@/lib/types";

/**
 * API tokens for the MCP server, one workspace each.
 * Only a SHA-256 hash is stored; the raw token is shown once, when it's created.
 */

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const toToken = (r: Row): ApiToken => ({
  id: r.id as string,
  name: r.name as string,
  prefix: r.prefix as string,
  createdAt: r.created_at as string,
  lastUsedAt: (r.last_used_at as string | null) ?? null,
});

export async function listApiTokens(workspaceId: string): Promise<ApiToken[]> {
  return (await q("SELECT * FROM api_tokens WHERE workspace_id = ? ORDER BY created_at DESC", workspaceId)).map(toToken);
}

export async function createApiToken(workspaceId: string, createdBy: string, name: string): Promise<{ token: string; record: ApiToken }> {
  const token = `qas_${randomBytes(24).toString("base64url")}`;
  const record: ApiToken = { id: nanoid(10), name, prefix: token.slice(0, 8), createdAt: new Date().toISOString(), lastUsedAt: null };
  await run(
    "INSERT INTO api_tokens (id, workspace_id, created_by, name, token_hash, prefix, created_at) VALUES (?,?,?,?,?,?,?)",
    record.id,
    workspaceId,
    createdBy,
    record.name,
    hash(token),
    record.prefix,
    record.createdAt,
  );
  return { token, record };
}

export async function revokeApiToken(workspaceId: string, id: string): Promise<boolean> {
  return (await run("DELETE FROM api_tokens WHERE id = ? AND workspace_id = ?", id, workspaceId)) > 0;
}

/** The token's record and workspace when the raw token is valid; stamps when it was last used. */
export async function verifyApiToken(raw: string | null | undefined): Promise<(ApiToken & { workspaceId: string }) | null> {
  if (!raw || !raw.startsWith("qas_")) return null;
  const r = await q1("SELECT * FROM api_tokens WHERE token_hash = ?", hash(raw));
  if (!r) return null;
  const ts = new Date().toISOString();
  await run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", ts, r.id as string);
  return { ...toToken(r), lastUsedAt: ts, workspaceId: r.workspace_id as string };
}
