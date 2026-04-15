import type { WebSocket } from "ws";
import crypto from "crypto";
import type { RobloxClient } from "./types.js";
import { HTTP_POLL_TIMEOUT } from "./constants.js";

const clientRegistry: Map<string, RobloxClient> = new Map();
const wsToClientId: Map<WebSocket, string> = new Map();

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startHttpSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, client] of clientRegistry) {
      if (client.transport === "http" && now - client.lastHttpPoll > HTTP_POLL_TIMEOUT) {
        unregisterClient(id);
      }
    }
  }, 5000);
}

export function getRegistry(): Map<string, RobloxClient> {
  return clientRegistry;
}

export function getWsToClientIdMap(): Map<WebSocket, string> {
  return wsToClientId;
}

export function registerClient(info: {
  username: string;
  userId: number;
  placeId: number;
  jobId: string;
  placeName: string;
  transport: "ws" | "http";
  ws?: WebSocket;
}): string {
  const clientId = crypto.randomUUID();
  const entry: RobloxClient = {
    clientId,
    username: info.username,
    userId: info.userId,
    placeId: info.placeId,
    jobId: info.jobId,
    placeName: info.placeName,
    transport: info.transport,
    ws: info.ws,
    lastHttpPoll: Date.now(),
    pendingCommandQueue: [],
  };
  clientRegistry.set(clientId, entry);
  if (info.ws) {
    wsToClientId.set(info.ws, clientId);
  }
  console.error(
    `[Registry] Client registered: ${clientId} (${info.username} @ ${info.placeName}, ${info.transport})`
  );

  startHttpSweep();

  return clientId;
}

export function unregisterClient(clientId: string) {
  const entry = clientRegistry.get(clientId);
  if (entry?.ws) {
    wsToClientId.delete(entry.ws);
  }
  clientRegistry.delete(clientId);
  console.error(`[Registry] Client unregistered: ${clientId}`);
}

export function getActiveClients(): RobloxClient[] {
  const active: RobloxClient[] = [];
  for (const entry of clientRegistry.values()) {
    if (entry.transport === "ws") {
      const { WebSocket: WS } = require("ws") as typeof import("ws");
      if (entry.ws && entry.ws.readyState === WS.OPEN) {
        active.push(entry);
      }
    } else {
      if (Date.now() - entry.lastHttpPoll < HTTP_POLL_TIMEOUT) {
        active.push(entry);
      }
    }
  }
  return active;
}

export function formatActiveClientListForTool(): string {
  const active = getActiveClients();
  if (active.length === 0) {
    return "No Roblox clients are currently connected.";
  }

  const clientList = active.map((c) => ({
    clientId: c.clientId,
    username: c.username,
    placeId: c.placeId,
    jobId: c.jobId,
    placeName: c.placeName,
    transport: c.transport,
  }));

  return JSON.stringify(clientList, null, 2);
}

export function resolveTargetClient(clientId?: string): RobloxClient | null {
  if (clientId) {
    const entry = clientRegistry.get(clientId);
    if (!entry) return null;
    const { WebSocket: WS } = require("ws") as typeof import("ws");
    if (entry.transport === "ws" && (!entry.ws || entry.ws.readyState !== WS.OPEN)) return null;
    if (entry.transport === "http" && Date.now() - entry.lastHttpPoll >= HTTP_POLL_TIMEOUT) return null;
    return entry;
  }
  const active = getActiveClients();
  if (active.length === 0) return null;
  const wsCl = active.filter((c) => c.transport === "ws");
  if (wsCl.length > 0) return wsCl[wsCl.length - 1];
  return active.sort((a, b) => b.lastHttpPoll - a.lastHttpPoll)[0];
}
