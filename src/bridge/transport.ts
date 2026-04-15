import crypto from "crypto";
import type { WebSocket } from "ws";
import type { RobloxClient, SendResult, RobloxResponse, MCPToolResult, InstanceRole } from "./types.js";
import { TOOL_RESPONSE_TIMEOUT } from "./constants.js";
import { getActiveClients, resolveTargetClient, getRegistry } from "./registry.js";

export const NO_CLIENT_ERROR: MCPToolResult = {
  content: [
    {
      type: "text",
      text: "No Roblox client connected to the MCP server. Please notify the user that they have to run the connector.luau script in order to connect the MCP server to their game.",
    },
  ],
  isError: true,
};

export const INVALID_CLIENT_ERROR: MCPToolResult = {
  content: [
    {
      type: "text",
      text: "Invalid client ID provided. Please use the list-clients tool to get a list of valid client IDs.",
    },
  ],
  isError: true,
};

export function errorResult(text: string): MCPToolResult {
  return {
    content: [{ type: "text", text }],
    isError: true,
  };
}

export function textResult(text: string): MCPToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

let instanceRole: InstanceRole = "primary";

let httpResponseResolvers: Map<string, (data: RobloxResponse) => void> = new Map();
let requestToClientId: Map<string, string> = new Map();
let relayClients: Set<WebSocket> = new Set();
let relayRequestOrigin: Map<string, WebSocket> = new Map();

let relaySocket: WebSocket | null = null;
let secondaryResponseResolvers: Map<string, (data: RobloxResponse) => void> = new Map();

export function setInstanceRole(role: InstanceRole) {
  instanceRole = role;
}

export function getInstanceRole(): InstanceRole {
  return instanceRole;
}

export function getHttpResponseResolvers() { return httpResponseResolvers; }
export function setHttpResponseResolvers(m: Map<string, (data: RobloxResponse) => void>) { httpResponseResolvers = m; }

export function getRequestToClientId() { return requestToClientId; }
export function setRequestToClientId(m: Map<string, string>) { requestToClientId = m; }

export function getRelayClients() { return relayClients; }
export function setRelayClients(s: Set<WebSocket>) { relayClients = s; }

export function getRelayRequestOrigin() { return relayRequestOrigin; }
export function setRelayRequestOrigin(m: Map<string, WebSocket>) { relayRequestOrigin = m; }

export function getRelaySocket() { return relaySocket; }
export function setRelaySocket(ws: WebSocket | null) { relaySocket = ws; }

export function getSecondaryResponseResolvers() { return secondaryResponseResolvers; }
export function setSecondaryResponseResolvers(m: Map<string, (data: RobloxResponse) => void>) { secondaryResponseResolvers = m; }

export function sendToClient(target: RobloxClient, message: string) {
  if (target.transport === "ws" && target.ws && target.ws.readyState === target.ws.OPEN) {
    target.ws.send(message);
  } else if (target.transport === "http") {
    target.pendingCommandQueue.push(message);
  }
}

export function getResponseOfIdFromClient(
  id: string,
  timeoutMs: number = TOOL_RESPONSE_TIMEOUT
): Promise<RobloxResponse | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: NodeJS.Timeout;

    const resolveOnce = (data: RobloxResponse | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(data);
    };

    timeout = setTimeout(() => {
      if (instanceRole === "secondary") {
        secondaryResponseResolvers.delete(id);
      } else {
        httpResponseResolvers.delete(id);
      }

      resolveOnce({
        id,
        output: undefined,
        error: `Timed out waiting for response after ${timeoutMs}ms.`,
      });
    }, timeoutMs);

    if (instanceRole === "secondary") {
      secondaryResponseResolvers.set(id, resolveOnce as (data: RobloxResponse) => void);
      return;
    }
    httpResponseResolvers.set(id, resolveOnce as (data: RobloxResponse) => void);
  });
}

export function sendArbitraryDataToClient(
  type: string,
  data: Record<string, unknown>,
  id?: string,
  clientId?: string,
): SendResult {
  if (instanceRole === "secondary") {
    if (!relaySocket || relaySocket.readyState !== relaySocket.OPEN) return { ok: false, reason: "no_client" };
    const msgId = id ?? crypto.randomUUID();
    const message = { id: msgId, ...data, type, ...(clientId ? { targetClientId: clientId } : {}) };
    relaySocket.send(JSON.stringify(message));
    return { ok: true, id: msgId };
  }

  if (clientId !== undefined) {
    const target = resolveTargetClient(clientId);
    if (!target) return { ok: false, reason: "invalid_client" };

    const msgId = id ?? crypto.randomUUID();
    const message = { id: msgId, ...data, type };
    requestToClientId.set(msgId, target.clientId);
    sendToClient(target, JSON.stringify(message));

    return { ok: true, id: msgId };
  }

  const activeClients = getActiveClients();
  if (activeClients.length === 0) return { ok: false, reason: "no_client" };

  const msgId = id ?? crypto.randomUUID();
  const message = { id: msgId, ...data, type };

  for (const target of activeClients) {
    requestToClientId.set(msgId, target.clientId);
    sendToClient(target, JSON.stringify(message));
  }

  return { ok: true, id: msgId };
}

export async function callClient(
  type: string,
  data: Record<string, unknown>,
  opts?: { timeout?: number; clientId?: string }
): Promise<MCPToolResult> {
  const sendResult = sendArbitraryDataToClient(type, data, undefined, opts?.clientId);

  if (!sendResult.ok) {
    if (sendResult.reason === "no_client") return NO_CLIENT_ERROR;
    if (sendResult.reason === "invalid_client") return INVALID_CLIENT_ERROR;
    return NO_CLIENT_ERROR;
  }

  const response = await getResponseOfIdFromClient(sendResult.id, opts?.timeout);

  if (!response?.output) {
    return errorResult(`Tool "${type}" returned no output: ${JSON.stringify(response)}`);
  }

  return textResult(response.output);
}

export function handleRobloxResponse(data: RobloxResponse) {
  if (!data.id) return;

  const originRelay = relayRequestOrigin.get(data.id);
  if (originRelay && originRelay.readyState === originRelay.OPEN) {
    originRelay.send(JSON.stringify(data));
    relayRequestOrigin.delete(data.id);
    requestToClientId.delete(data.id);
    return;
  }
  relayRequestOrigin.delete(data.id);

  if (httpResponseResolvers.has(data.id)) {
    httpResponseResolvers.get(data.id)?.(data);
    httpResponseResolvers.delete(data.id);
  }
  requestToClientId.delete(data.id);
}

export function drainHttpCommandQueue(client: RobloxClient): string[] {
  const commands = client.pendingCommandQueue.splice(0);
  return commands;
}
