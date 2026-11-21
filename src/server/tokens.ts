import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { q, q1, run, type Row } from "./db";
import type { ApiToken } from "@/lib/types";

/**
 * API tokens, one workspace each. Only a SHA-256 hash is stored; the raw token is shown once.
 *  - mcp        `qas_…`  for AI agents over MCP. They act as an agent (can mark Fixed, never Verified).
 *  - extension  `qasx_…` for the browser extension. It acts as the person who connected it, through
 *               the same API the app uses (see getCtx in session.ts). Never accepted by the MCP server.
 */
export type TokenKind = "mcp" | "extension";
const PREFIX: Record<TokenKind, string> = { mcp: "qas_", extension: "qasx_" };

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const toToken = (r: Row): ApiToken => ({
  id: r.id as string,
  name: r.name as string,
  prefix: r.prefix as string,
  createdAt: r.created_at as string,
  lastUsedAt: (r.last_used_at as string | null) ?? null,
});

export async function listApiTokens(workspaceId: string, kind: TokenKind = "mcp"): Promise<ApiToken[]> {
  return (await q("SELECT * FROM api_tokens WHERE workspace_id = ? AND kind = ? ORDER BY created_at DESC", workspaceId, kind)).map(toToken);
}

export async function createApiToken(workspaceId: string, createdBy: string, name: string, kind: TokenKind = "mcp"): Promise<{ token: string; record: ApiToken }> {
  const token = `${PREFIX[kind]}${randomBytes(24).toString("base64url")}`;
  const record: ApiToken = { id: nanoid(10), name, prefix: token.slice(0, kind === "mcp" ? 8 : 9), createdAt: new Date().toISOString(), lastUsedAt: null };
  await run(
    "INSERT INTO api_tokens (id, workspace_id, created_by, name, token_hash, prefix, created_at, kind) VALUES (?,?,?,?,?,?,?,?)",
    record.id,
    workspaceId,
    createdBy,
    record.name,
    hash(token),
    record.prefix,
    record.createdAt,
    kind,
  );
  return { token, record };
}

export async function revokeApiToken(workspaceId: string, id: string): Promise<boolean> {
  return (await run("DELETE FROM api_tokens WHERE id = ? AND workspace_id = ?", id, workspaceId)) > 0;
}

/** The token's record and workspace when the raw token is valid; stamps when it was last used. */
export async function verifyApiToken(raw: string | null | undefined): Promise<(ApiToken & { workspaceId: string }) | null> {
  if (!raw || !raw.startsWith(PREFIX.mcp)) return null;
  const r = await q1("SELECT * FROM api_tokens WHERE token_hash = ? AND kind = 'mcp'", hash(raw));
  if (!r) return null;
  const ts = new Date().toISOString();
  await run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", ts, r.id as string);
  return { ...toToken(r), lastUsedAt: ts, workspaceId: r.workspace_id as string };
}

/** An extension token's workspace and the user who connected it, or null. Stamps when it was last used. */
export async function verifyExtensionToken(raw: string | null | undefined): Promise<{ workspaceId: string; userId: string } | null> {
  if (!raw || !raw.startsWith(PREFIX.extension)) return null;
  const r = await q1("SELECT * FROM api_tokens WHERE token_hash = ? AND kind = 'extension'", hash(raw));
  if (!r?.created_by) return null;
  // At most one write a minute per token: every extension request carries it.
  const last = r.last_used_at ? Date.parse(r.last_used_at as string) : 0;
  if (Date.now() - last > 60_000) await run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", new Date().toISOString(), r.id as string);
  return { workspaceId: r.workspace_id as string, userId: r.created_by as string };
}
