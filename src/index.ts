#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./tools/server.js";
import { startAsPrimary } from "./bridge/primary.js";
import { startAsSecondary } from "./bridge/secondary.js";
import { setBaseUrl } from "./tools/screenshot.js";
import { WS_PORT } from "./bridge/constants.js";

const args = process.argv.slice(2);
const baseUrlIdx = args.indexOf("--baseurl");
const BASE_URL: string | null = baseUrlIdx !== -1 ? (args[baseUrlIdx + 1] ?? null) : null;

if (BASE_URL) {
  console.error(`[Config] --baseurl specified: ${BASE_URL} (will run as secondary relay to this host)`);
  setBaseUrl(BASE_URL);
}

async function boot() {
  if (BASE_URL) {
    const relayUrl = BASE_URL.replace(/\/$/, "") + "/mcp-relay";
    console.error(`[Boot] --baseurl mode: targeting relay at ${relayUrl}`);

    startAsSecondary(relayUrl, async () => {
      console.error("[Boot] Remote unreachable — starting as primary (fallback).");
      try {
        await startAsPrimary();
        console.error("[Boot] Primary started successfully (fallback from --baseurl).");
      } catch (err: any) {
        if (err?.code === "EADDRINUSE") {
          console.error("[Boot] Port in use locally too — becoming secondary to localhost.");
          startAsSecondary();
        } else {
          console.error("[Boot] Fatal error during fallback primary start:", err);
          process.exit(1);
        }
      }
    });
    return;
  }

  try {
    await startAsPrimary();
  } catch (err: any) {
    if (err?.code === "EADDRINUSE") {
      startAsSecondary();
    } else {
      console.error("[Boot] Fatal error:", err);
      process.exit(1);
    }
  }
}

const server = createMcpServer();
const transport = new StdioServerTransport();
server.connect(transport);
console.error("MCP Server started and connected via stdio.");

boot();
