import { callTool, listTools, MCP_INSTRUCTIONS, MCP_SERVER_INFO, type McpContext } from "@/server/mcp";
import { verifyApiToken } from "@/server/tokens";

/**
 * MCP endpoint (Streamable HTTP transport, stateless, JSON responses).
 *   POST /api/mcp   Authorization: Bearer qas_…   body: JSON-RPC request(s)
 * Tokens are created in Settings → AI agents (MCP).
 */
export const dynamic = "force-dynamic";

const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

type JsonRpcId = string | number | null;
interface JsonRpcMessage {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: JsonRpcId, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

async function handle(msg: JsonRpcMessage, ctx: McpContext) {
  const id = msg.id ?? null;
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(id, -32600, "Invalid JSON-RPC request");
  switch (msg.method) {
    case "initialize": {
      const asked = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : "";
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: MCP_SERVER_INFO,
        instructions: MCP_INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: listTools() });
    case "tools/call": {
      const name = msg.params?.name;
      if (typeof name !== "string") return rpcError(id, -32602, "Missing tool name");
      const out = await callTool(name, (msg.params?.arguments as Record<string, unknown>) ?? {}, ctx);
      return out ? rpcResult(id, out) : rpcError(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      return rpcError(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  // DNS-rebinding guard: browsers send Origin; it must be this site.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("host") ?? url.host)) return json(rpcError(null, -32000, "Origin not allowed"), 403);

  const raw = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const token = await verifyApiToken(raw);
  if (!token) {
    return json(rpcError(null, -32001, "Missing or invalid API token. Create one in QASync → Settings → AI agents (MCP), then send it as 'Authorization: Bearer <token>'."), 401, {
      "WWW-Authenticate": 'Bearer realm="QASync"',
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  // Links should point where the client reached us (works behind tunnels/proxies too).
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const ctx: McpContext = { origin: `${proto}://${host}`, actor: token.name, workspaceId: token.workspaceId };

  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as JsonRpcMessage[];
  // Notifications and client responses (no id, or no method) get no reply.
  const replies = messages.filter((m) => m && typeof m === "object" && m.id !== undefined && m.method !== undefined).map((m) => handle(m, ctx));
  const results = await Promise.all(replies);
  if (!results.length) return new Response(null, { status: 202 });
  return json(batch ? results : results[0]);
}

/** This server doesn't push messages, so there's no SSE stream to open. */
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
