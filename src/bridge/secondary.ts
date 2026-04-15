import { WebSocket } from "ws";
import { WS_PORT, PROMOTION_JITTER_MAX } from "./constants.js";
import type { RobloxResponse, InstanceRole } from "./types.js";
import {
  setInstanceRole,
  setRelaySocket,
  getRelaySocket,
  getSecondaryResponseResolvers,
  setSecondaryResponseResolvers,
} from "./transport.js";
import { startAsPrimary } from "./primary.js";

export function startAsSecondary(
  relayUrl: string = `ws://localhost:${WS_PORT}/mcp-relay`,
  onFailed?: () => void
): void {
  setInstanceRole("secondary");
  setSecondaryResponseResolvers(new Map());

  console.error(`[Secondary] Connecting to primary relay at ${relayUrl} ...`);

  const socket = new WebSocket(relayUrl);
  setRelaySocket(socket);

  let everConnected = false;

  socket.on("open", () => {
    everConnected = true;
    console.error("[Secondary] Connected to primary via relay.");
  });

  socket.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData.toString()) as RobloxResponse;
      const resolvers = getSecondaryResponseResolvers();
      if (data.id && resolvers.has(data.id)) {
        resolvers.get(data.id)!(data);
        resolvers.delete(data.id);
      }
    } catch (e) {
      console.error("[Secondary] Error parsing relay response:", e);
    }
  });

  socket.on("close", () => {
    setRelaySocket(null);
    const resolvers = getSecondaryResponseResolvers();
    for (const [id, resolver] of resolvers.entries()) {
      resolver({ id, output: undefined });
    }
    resolvers.clear();

    if (!everConnected && onFailed) {
      console.error("[Secondary] Never connected — remote unreachable. Falling back to primary mode.");
      onFailed();
    } else if (everConnected) {
      console.error("[Secondary] Lost connection to primary. Attempting promotion...");
      tryPromote();
    }
  });

  socket.on("error", (err) => {
    console.error("[Secondary] Relay socket error:", err.message);
  });
}

function tryPromote() {
  const jitter = Math.floor(Math.random() * PROMOTION_JITTER_MAX);
  console.error(`[Promote] Waiting ${jitter}ms before attempting promotion...`);

  setTimeout(async () => {
    try {
      await startAsPrimary();
      console.error("[Promote] Successfully promoted to primary!");
    } catch {
      console.error(
        "[Promote] Another instance already claimed primary. Reconnecting as secondary..."
      );
      setTimeout(() => startAsSecondary(), 200);
    }
  }, jitter);
}
