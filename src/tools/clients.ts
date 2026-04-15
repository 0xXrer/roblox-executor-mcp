import { z } from "zod";
import { getInstanceRole, getRelaySocket, getResponseOfIdFromClient, NO_CLIENT_ERROR, textResult } from "../bridge/transport.js";
import { formatActiveClientListForTool } from "../bridge/registry.js";
import type { MCPToolResult } from "../bridge/types.js";
import crypto from "crypto";


export const listClientsSchema = z.object({});

export const listClientsDefinition = {
  title: "List connected Roblox clients",
  description:
    "Returns a list of all Roblox game clients currently connected to the MCP bridge, including their clientId, username, placeId, jobId, and placeName. Use the clientId from this list to target specific clients in other tools.",
  inputSchema: listClientsSchema,
};

export async function listClientsHandler(): Promise<MCPToolResult> {
  if (getInstanceRole() === "secondary") {

    const id = crypto.randomUUID();
    const relaySocket = getRelaySocket();
    if (relaySocket && relaySocket.readyState === relaySocket.OPEN) {
      relaySocket.send(JSON.stringify({ id, type: "list-clients" }));
      const response = await getResponseOfIdFromClient(id);
      return textResult(response?.output ?? response?.error ?? "Failed to list clients.");
    }
    return NO_CLIENT_ERROR;
  }

  return textResult(formatActiveClientListForTool());
}




