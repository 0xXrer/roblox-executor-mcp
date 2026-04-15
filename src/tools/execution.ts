import { z } from "zod";
import fs from "fs";
import { callClient, sendArbitraryDataToClient, NO_CLIENT_ERROR, INVALID_CLIENT_ERROR, textResult, errorResult } from "../bridge/transport.js";
import type { MCPToolResult } from "../bridge/types.js";

export const clientIdSchema = z
  .string()
  .describe(
    "Target a specific Roblox client by its clientId. Use the list-clients tool to discover connected clients. If omitted, the most recently active client is used."
  )
  .optional();


export const executeSchema = z.object({
  code: z
    .string()
    .describe(
      "The code to execute in the Roblox Game Client. This tool does NOT return output - use get-data-by-code if you need to retrieve data."
    ),
  threadContext: z
    .number()
    .describe(
      "The thread identity to execute the code in (default: 8, normal game scripts run on 2)"
    )
    .optional()
    .default(8),
  clientId: clientIdSchema,
});

export const executeDefinition = {
  title: "Execute Code in the Roblox Game Client",

  description:
    "Executes Lua code in Roblox without returning a value. Use for fire-and-forget actions (move a character, change properties). Use get-data-by-code when you need the result.",
  inputSchema: executeSchema,
};

export async function executeHandler({ code, threadContext, clientId }: z.infer<typeof executeSchema>): Promise<MCPToolResult> {
  console.error(`Executing code in thread ${threadContext}...`);

  const sendResult = sendArbitraryDataToClient("execute", {
    source: `setthreadidentity(${threadContext})\n${code}`,
  }, undefined, clientId);

  if (!sendResult.ok) {
    if (sendResult.reason === "invalid_client") return INVALID_CLIENT_ERROR;
    return NO_CLIENT_ERROR;
  }

  return textResult(`Code has been scheduled to be run in thread context ${threadContext}.`);
}


export const executeFileSchema = z.object({
  filePath: z
    .string()
    .describe(
      "The absolute path to the .luau or .lua file to execute"
    ),
  threadContext: z
    .number()
    .describe(
      "The thread identity to execute the code in (default: 8, normal game scripts run on 2)"
    )
    .optional()
    .default(8),
  clientId: clientIdSchema,
});

export const executeFileDefinition = {
  title: "Execute a Luau file in the Roblox Game Client",
  description:
    "Reads a local .luau or .lua file from disk and executes its contents in the Roblox Game Client. This tool does NOT return output - use get-data-by-code if you need to retrieve data.",
  inputSchema: executeFileSchema,
};

export async function executeFileHandler({ filePath, threadContext, clientId }: z.infer<typeof executeFileSchema>): Promise<MCPToolResult> {
  if (!fs.existsSync(filePath)) {
    return errorResult(`File not found: ${filePath}`);
  }

  const code = fs.readFileSync(filePath, "utf-8");
  console.error(`Executing file ${filePath} in thread ${threadContext}...`);

  const sendResult = sendArbitraryDataToClient("execute", {
    source: `setthreadidentity(${threadContext})\n${code}`,
  }, undefined, clientId);

  if (!sendResult.ok) {
    if (sendResult.reason === "invalid_client") return INVALID_CLIENT_ERROR;
    return NO_CLIENT_ERROR;
  }

  return textResult(`File executed: ${filePath} (thread context ${threadContext})`);
}


export const getDataByCodeSchema = z.object({
  code: z
    .string()
    .describe(
      "The code to execute in the Roblox Game Client (MUST return one or more values). Return raw Lua values - do NOT manually serialize tables or use JSONEncode, the connector handles serialization automatically."
    ),
  threadContext: z
    .number()
    .describe(
      "The thread identity to execute the code in (default: 8, normal game scripts run on 2)"
    )
    .optional()
    .default(8),
  timeout: z
    .number()
    .describe(
      "Timeout in milliseconds for the response (default: 15000, max: 120000). Increase for long-running operations like decompiling many modules."
    )
    .optional()
    .default(15000),
  clientId: clientIdSchema,
});

export const getDataByCodeDefinition = {
  title: "Get data by code",
  description:
    "Query data from the Roblox Game Client by executing code, note that the code MUST return one or more values. IMPORTANT: Do NOT serialize/encode the return value yourself (no HttpService:JSONEncode, no custom table-to-string) - just return raw Lua values directly. The connector automatically serializes all returned data.",
  inputSchema: getDataByCodeSchema,
};

export async function getDataByCodeHandler({ code, threadContext, timeout, clientId }: z.infer<typeof getDataByCodeSchema>): Promise<MCPToolResult> {
  console.error(`Executing code in thread ${threadContext}...`);

  const clampedTimeout = Math.min(Math.max(timeout, 1000), 120000);

  if (!/\breturn\b/.test(code)) {
    return errorResult(
      'The code does not contain a "return" statement. get-data-by-code requires the code to return one or more values. Use the "execute" tool instead if you don\'t need a result.'
    );
  }

  return callClient("get-data-by-code", {
    source: `setthreadidentity(${threadContext});${code}`,
  }, { timeout: clampedTimeout, clientId });
}


export const getConsoleOutputSchema = z.object({
  limit: z
    .number()
    .describe(
      "Maximum number of results to return (default: 50, to avoid overwhelming output)"
    )
    .optional()
    .default(50),
  logsOrder: z
    .enum(["NewestFirst", "OldestFirst"])
    .describe("The order of the logs to return (default: NewestFirst)")
    .optional()
    .default("NewestFirst"),
  clientId: clientIdSchema,
});

export const getConsoleOutputDefinition = {
  title: "Get the roblox developer console output from the Roblox Game Client",
  inputSchema: getConsoleOutputSchema,
};

export async function getConsoleOutputHandler(params: z.infer<typeof getConsoleOutputSchema>): Promise<MCPToolResult> {
  const { limit, logsOrder, clientId } = params;
  return callClient("get-console-output", { limit, logsOrder }, { clientId });
}


export const getGameInfoSchema = z.object({
  clientId: clientIdSchema,
});

export const getGameInfoDefinition = {
  title: "Get information about the current Roblox game",
  description:
    "Retrieves basic information about the current game including PlaceId, GameId, PlaceVersion, and other metadata.",
  inputSchema: getGameInfoSchema,
};

export async function getGameInfoHandler({ clientId }: z.infer<typeof getGameInfoSchema>): Promise<MCPToolResult> {
  return callClient("get-game-info", {}, { clientId });
}
