import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WS_PORT } from "./constants.js";
import { STATUS_PAGE_HTML } from "./dashboard.js";
import type { RobloxResponse, ScreenshotResult, RobloxWindowInfo } from "./types.js";
import {
  getRegistry,
  getWsToClientIdMap,
  getActiveClients,
  resolveTargetClient,
  formatActiveClientListForTool,
  registerClient,
  unregisterClient,
} from "./registry.js";
import {
  setInstanceRole,
  getHttpResponseResolvers,
  setHttpResponseResolvers,
  getRequestToClientId,
  setRequestToClientId,
  getRelayClients,
  setRelayClients,
  getRelayRequestOrigin,
  setRelayRequestOrigin,
  sendToClient,
  handleRobloxResponse,
  drainHttpCommandQueue,
} from "./transport.js";
import { performScreenshot, enumRobloxWindows } from "./screenshot.js";

export function startAsPrimary(): Promise<void> {
  return new Promise((resolve, reject) => {
    setInstanceRole("primary");

    const clientRegistry = getRegistry();
    clientRegistry.clear();
    const wsMap = getWsToClientIdMap();
    wsMap.clear();
    setHttpResponseResolvers(new Map());
    setRequestToClientId(new Map());
    setRelayClients(new Set());
    setRelayRequestOrigin(new Map());

    const httpServer = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || "/", `http://localhost:${WS_PORT}`);

        if (url.pathname === "/" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(STATUS_PAGE_HTML);
          return;
        }

        if (url.pathname === "/api/status" && req.method === "GET") {
          const active = getActiveClients();
          const relayClients = getRelayClients();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              connected: active.length > 0,
              clientCount: active.length,
              role: "Primary",
              relayClients: relayClients.size,
              clients: active.map((c) => ({
                clientId: c.clientId,
                username: c.username,
                userId: c.userId,
                placeId: c.placeId,
                jobId: c.jobId,
                placeName: c.placeName,
                transport: c.transport,
              })),
            })
          );
          return;
        }

        if (url.pathname === "/api/avatar" && req.method === "GET") {
          const userId = url.searchParams.get("userId");
          if (!userId) {
            res.writeHead(400);
            res.end("Missing userId");
            return;
          }

          try {
            const robloxRes = await fetch(
              `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userId)}&size=150x150&format=Png&isCircular=false`
            );
            const json = await robloxRes.json() as { data?: { imageUrl?: string }[] };
            const imageUrl = json.data?.[0]?.imageUrl;
            if (imageUrl) {
              res.writeHead(302, { Location: imageUrl, "Cache-Control": "public, max-age=300" });
              res.end();
            } else {
              res.writeHead(404);
              res.end("No thumbnail found");
            }
          } catch {
            res.writeHead(502);
            res.end("Failed to fetch thumbnail");
          }
          return;
        }

        if (url.pathname === "/register" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              const info = JSON.parse(body);
              const clientId = registerClient({
                username: info.username || "Unknown",
                userId: info.userId || 0,
                placeId: info.placeId || 0,
                jobId: info.jobId || "",
                placeName: info.placeName || "Unknown",
                transport: "http",
              });
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ clientId }));
            } catch {
              res.writeHead(400);
              res.end("Invalid JSON");
            }
          });
          return;
        }

        if (url.pathname === "/poll" && req.method === "GET") {
          const clientId = url.searchParams.get("clientId");
          if (!clientId) {
            res.writeHead(400);
            res.end("Missing clientId query parameter");
            return;
          }

          const reg = getRegistry();
          const client = reg.get(clientId);
          if (!client) {
            res.writeHead(404);
            res.end("Unknown clientId");
            return;
          }

          client.lastHttpPoll = Date.now();

          const commands = drainHttpCommandQueue(client);
          if (commands.length > 0) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(commands.length === 1 ? JSON.parse(commands[0]) : commands.map(c => JSON.parse(c))));
          } else {
            res.writeHead(204);
            res.end();
          }
          return;
        }

        if (url.pathname === "/respond" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              handleRobloxResponse(data as RobloxResponse);
              res.writeHead(200);
              res.end("OK");
            } catch {
              res.writeHead(400);
              res.end("Invalid JSON");
            }
          });
          return;
        }

        if (url.pathname === "/api/screenshot" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              if (process.platform !== "win32") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Screenshots are only supported on Windows." }));
                return;
              }
              const params = body ? JSON.parse(body) : {};
              const pid: number | undefined = params.pid;
              const result = performScreenshot(pid);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Screenshot failed: ${err.message || err}` }));
            }
          });
          return;
        }

        if (url.pathname === "/api/windows" && req.method === "GET") {
          try {
            if (process.platform !== "win32") {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Window enumeration is only supported on Windows." }));
              return;
            }
            const windows = enumRobloxWindows();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ windows }));
          } catch (err: any) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Window enumeration failed: ${err.message || err}` }));
          }
          return;
        }

        res.writeHead(200);
        res.end("MCP Server Running");
      }
    );

    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(err);
      } else {
        console.error("[Primary] HTTP server error:", err);
        reject(err);
      }
    });

    httpServer.listen(WS_PORT, () => {
      console.error(
        `[Primary] MCP Bridge listening on port ${WS_PORT} (WebSocket + HTTP)`
      );

      const wss = new WebSocketServer({ server: httpServer });

      wss.on("connection", (ws, req) => {
        const urlPath = req.url || "/";

        if (urlPath === "/mcp-relay") {
          const relayClients = getRelayClients();
          console.error(`[Primary] Relay client connected. Total: ${relayClients.size + 1}`);
          relayClients.add(ws);

          ws.on("message", (rawData) => {
            try {
              const message = JSON.parse(rawData.toString());

              if (message.type === "list-clients" && message.id) {
                ws.send(
                  JSON.stringify({
                    id: message.id,
                    output: formatActiveClientListForTool(),
                  })
                );
                return;
              }

              const relayRequestOrigin = getRelayRequestOrigin();
              const requestToClientId = getRequestToClientId();

              if (message.id) {
                relayRequestOrigin.set(message.id, ws);
              }

              const targetClientId = message.targetClientId;
              if (targetClientId) {
                delete message.targetClientId;
              }

              const target = resolveTargetClient(targetClientId);
              if (target) {
                requestToClientId.set(message.id, target.clientId);
                sendToClient(target, JSON.stringify(message));
              } else if (message.id) {
                relayRequestOrigin.delete(message.id);
                ws.send(
                  JSON.stringify({
                    id: message.id,
                    output: undefined,
                    error: "No active Roblox client connected.",
                  })
                );
              }
            } catch (e) {
              console.error("[Primary] Error parsing relay message:", e);
            }
          });

          ws.on("close", () => {
            const relayClients = getRelayClients();
            const relayRequestOrigin = getRelayRequestOrigin();
            relayClients.delete(ws);
            console.error(`[Primary] Relay client disconnected. Total: ${relayClients.size}`);
            for (const [id, origin] of relayRequestOrigin.entries()) {
              if (origin === ws) relayRequestOrigin.delete(id);
            }
          });

          ws.on("error", (err) => {
            console.error("[Primary] Relay client error:", err.message);
            getRelayClients().delete(ws);
          });

          return;
        }

        console.error("[Primary] Roblox client connected via WebSocket (awaiting registration).");

        ws.on("message", (rawData) => {
          try {
            const data = JSON.parse(rawData.toString());

            if (data.type === "register") {
              const clientId = registerClient({
                username: data.username || "Unknown",
                userId: data.userId || 0,
                placeId: data.placeId || 0,
                jobId: data.jobId || "",
                placeName: data.placeName || "Unknown",
                transport: "ws",
                ws,
              });
              ws.send(JSON.stringify({ type: "registered", clientId }));
              return;
            }

            handleRobloxResponse(data as RobloxResponse);
          } catch (e) {
            console.error("[Primary] Error parsing Roblox WS message:", e);
          }
        });

        ws.on("close", () => {
          const wsMap = getWsToClientIdMap();
          const clientId = wsMap.get(ws);
          if (clientId) {
            unregisterClient(clientId);
          }
          console.error("[Primary] Roblox client disconnected.");
        });
      });

      resolve();
    });
  });
}
