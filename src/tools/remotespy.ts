import { z } from "zod";
import { callClient } from "../bridge/transport.js";
import type { MCPToolResult } from "../bridge/types.js";
import { clientIdSchema } from "./execution.js";


export const ensureRemoteSpySchema = z.object({
  clientId: clientIdSchema,
});

export const ensureRemoteSpyDefinition = {
  title: "Ensure the Cobalt remote spy is loaded",
  description:
    "Loads the Cobalt remote spy if it is not already running. Cobalt hooks all RemoteEvents, RemoteFunctions, BindableEvents, BindableFunctions (both incoming and outgoing, including Actors) and logs their calls. Must be called before using get-remote-spy-logs. Returns the current status of Cobalt.",
  inputSchema: ensureRemoteSpySchema,
};

export async function ensureRemoteSpyHandler({ clientId }: z.infer<typeof ensureRemoteSpySchema>): Promise<MCPToolResult> {
  return callClient("ensure-remote-spy", {}, { clientId });
}


export const getRemoteSpyLogsSchema = z.object({
  direction: z
    .enum(["Incoming", "Outgoing", "Both"])
    .describe("Filter by call direction (default: Both)")
    .optional()
    .default("Both"),
  remoteNameFilter: z
    .string()
    .describe(
      "Optional filter — only return logs for remotes whose name contains this string (case-insensitive)"
    )
    .optional(),
  limit: z
    .number()
    .describe(
      "Maximum number of remote logs to return (default: 50)"
    )
    .optional()
    .default(50),
  maxCallsPerRemote: z
    .number()
    .describe(
      "Maximum number of recent calls to return per remote (default: 5)"
    )
    .optional()
    .default(5),
  clientId: clientIdSchema,
});

export const getRemoteSpyLogsDefinition = {
  title: "Get captured remote spy logs from Cobalt",
  description:
    'Retrieves captured remote/bindable call logs from the Cobalt remote spy. Returns remote name, class, direction (Incoming/Outgoing), call count, and recent call arguments. Cobalt must be loaded first via ensure-remote-spy.',
  inputSchema: getRemoteSpyLogsSchema,
};

export async function getRemoteSpyLogsHandler({ direction, remoteNameFilter, limit, maxCallsPerRemote, clientId }: z.infer<typeof getRemoteSpyLogsSchema>): Promise<MCPToolResult> {
  return callClient("get-remote-spy-logs", {
    direction,
    remoteNameFilter: remoteNameFilter || "",
    limit,
    maxCallsPerRemote,
  }, { clientId });
}


export const clearRemoteSpyLogsSchema = z.object({
  clientId: clientIdSchema,
});

export const clearRemoteSpyLogsDefinition = {
  title: "Clear all remote spy logs",
  description:
    "Clears all captured remote spy logs from Cobalt. This removes all logged calls for every remote. Cobalt must be loaded first via ensure-remote-spy.",
  inputSchema: clearRemoteSpyLogsSchema,
};

export async function clearRemoteSpyLogsHandler({ clientId }: z.infer<typeof clearRemoteSpyLogsSchema>): Promise<MCPToolResult> {
  return callClient("clear-remote-spy-logs", {}, { clientId });
}


export const blockRemoteSchema = z.object({
  remoteName: z
    .string()
    .describe("The exact name of the remote to block/unblock"),
  direction: z
    .enum(["Incoming", "Outgoing"])
    .describe("Whether the remote is Incoming or Outgoing"),
  shouldBlock: z
    .boolean()
    .describe("true to block, false to unblock")
    .optional()
    .default(true),
  clientId: clientIdSchema,
});

export const blockRemoteDefinition = {
  title: "Block or unblock a remote",
  description:
    "Block or unblock a specific remote event/function in the Cobalt remote spy. Blocked remotes will have their calls prevented from reaching the server/client. Cobalt must be loaded first via ensure-remote-spy.",
  inputSchema: blockRemoteSchema,
};

export async function blockRemoteHandler({ remoteName, direction, shouldBlock, clientId }: z.infer<typeof blockRemoteSchema>): Promise<MCPToolResult> {
  return callClient("block-remote", { remoteName, direction, shouldBlock }, { clientId });
}


export const ignoreRemoteSchema = z.object({
  remoteName: z
    .string()
    .describe("The exact name of the remote to ignore/unignore"),
  direction: z
    .enum(["Incoming", "Outgoing"])
    .describe("Whether the remote is Incoming or Outgoing"),
  shouldIgnore: z
    .boolean()
    .describe("true to ignore, false to unignore")
    .optional()
    .default(true),
  clientId: clientIdSchema,
});

export const ignoreRemoteDefinition = {
  title: "Ignore or unignore a remote",
  description:
    "Ignore or unignore a specific remote event/function in the Cobalt remote spy. Ignored remotes will still fire but their calls won't be logged. Cobalt must be loaded first via ensure-remote-spy.",
  inputSchema: ignoreRemoteSchema,
};

export async function ignoreRemoteHandler({ remoteName, direction, shouldIgnore, clientId }: z.infer<typeof ignoreRemoteSchema>): Promise<MCPToolResult> {
  return callClient("ignore-remote", { remoteName, direction, shouldIgnore }, { clientId });
}
