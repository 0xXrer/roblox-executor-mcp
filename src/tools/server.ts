import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodObject } from "zod";

import {
  executeSchema,
  executeDefinition,
  executeHandler,
  executeFileSchema,
  executeFileDefinition,
  executeFileHandler,
  getDataByCodeSchema,
  getDataByCodeDefinition,
  getDataByCodeHandler,
  getConsoleOutputSchema,
  getConsoleOutputDefinition,
  getConsoleOutputHandler,
  getGameInfoSchema,
  getGameInfoDefinition,
  getGameInfoHandler,
} from "./execution.js";

import {
  getScriptContentSchema,
  getScriptContentDefinition,
  getScriptContentHandler,
  searchInstancesSchema,
  searchInstancesDefinition,
  searchInstancesHandler,
  getDescendantsTreeSchema,
  getDescendantsTreeDefinition,
  getDescendantsTreeHandler,
  scriptGrepSchema,
  scriptGrepDefinition,
  scriptGrepHandler,
} from "./inspection.js";

import {
  ensureRemoteSpySchema,
  ensureRemoteSpyDefinition,
  ensureRemoteSpyHandler,
  getRemoteSpyLogsSchema,
  getRemoteSpyLogsDefinition,
  getRemoteSpyLogsHandler,
  clearRemoteSpyLogsSchema,
  clearRemoteSpyLogsDefinition,
  clearRemoteSpyLogsHandler,
  blockRemoteSchema,
  blockRemoteDefinition,
  blockRemoteHandler,
  ignoreRemoteSchema,
  ignoreRemoteDefinition,
  ignoreRemoteHandler,
} from "./remotespy.js";

import {
  screenshotWindowSchema,
  screenshotWindowDefinition,
  screenshotWindowHandler,
  listRobloxWindowsSchema,
  listRobloxWindowsDefinition,
  listRobloxWindowsHandler,
} from "./screenshot.js";

import {
  typeTextBoxSchema,
  typeTextBoxDefinition,
  typeTextBoxHandler,
  clickButtonSchema,
  clickButtonDefinition,
  clickButtonHandler,
} from "./ui.js";

import {
  listClientsSchema,
  listClientsDefinition,
  listClientsHandler,
} from "./clients.js";


interface ToolDef<T extends ZodObject<any>> {
  title: string;
  description?: string;
  inputSchema: T;
}

type ToolHandler<T> = (args: T) => Promise<any>;

const tools: Array<{
  name: string;
  def: ToolDef<any>;
  handler: ToolHandler<any>;
}> = [

  { name: "list-clients", def: listClientsDefinition, handler: listClientsHandler },

  { name: "execute", def: executeDefinition, handler: executeHandler },
  { name: "execute-file", def: executeFileDefinition, handler: executeFileHandler },
  { name: "get-data-by-code", def: getDataByCodeDefinition, handler: getDataByCodeHandler },
  { name: "get-console-output", def: getConsoleOutputDefinition, handler: getConsoleOutputHandler },
  { name: "get-game-info", def: getGameInfoDefinition, handler: getGameInfoHandler },

  { name: "get-script-content", def: getScriptContentDefinition, handler: getScriptContentHandler },
  { name: "search-instances", def: searchInstancesDefinition, handler: searchInstancesHandler },
  { name: "get-descendants-tree", def: getDescendantsTreeDefinition, handler: getDescendantsTreeHandler },
  { name: "script-grep", def: scriptGrepDefinition, handler: scriptGrepHandler },

  { name: "ensure-remote-spy", def: ensureRemoteSpyDefinition, handler: ensureRemoteSpyHandler },
  { name: "get-remote-spy-logs", def: getRemoteSpyLogsDefinition, handler: getRemoteSpyLogsHandler },
  { name: "clear-remote-spy-logs", def: clearRemoteSpyLogsDefinition, handler: clearRemoteSpyLogsHandler },
  { name: "block-remote", def: blockRemoteDefinition, handler: blockRemoteHandler },
  { name: "ignore-remote", def: ignoreRemoteDefinition, handler: ignoreRemoteHandler },

  { name: "screenshot-window", def: screenshotWindowDefinition, handler: screenshotWindowHandler },
  { name: "list-roblox-windows", def: listRobloxWindowsDefinition, handler: listRobloxWindowsHandler },

  { name: "type-text-box", def: typeTextBoxDefinition, handler: typeTextBoxHandler },
  { name: "click-button", def: clickButtonDefinition, handler: clickButtonHandler },
];


export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "RobloxMCP",
    version: "1.0.0",
    description:
      "A MCP Server allowing interaction to the Roblox Game Client (including access to restricted APIs such as getgc(), getreg(), etc.) with full control over the game.",
  });

  for (const { name, def, handler } of tools) {
    server.registerTool(
      name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.inputSchema,
      },
      async (args: any) => {
        try {
          return await handler(args);
        } catch (err: any) {
          console.error(`[Tool:${name}] Error:`, err.message);
          return {
            content: [{ type: "text", text: `Tool error: ${err.message}` }],
            isError: true,
          };
        }
      }
    );
  }

  return server;
}
