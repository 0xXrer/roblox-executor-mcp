import { z } from "zod";
import { callClient } from "../bridge/transport.js";
import type { MCPToolResult } from "../bridge/types.js";
import { clientIdSchema } from "./execution.js";


export const typeTextBoxSchema = z.object({
  path: z
    .string()
    .describe("The instance path to the TextBox"),
  text: z
    .string()
    .describe("The string to type into the TextBox"),
  enter: z
    .boolean()
    .describe("Whether to press Enter after typing")
    .optional()
    .default(false),
  useKeyPress: z
    .boolean()
    .describe("If true, simulates real keystrokes using VirtualInputManager / keypress. If false, directly sets the Text property.")
    .optional()
    .default(true),
  clientId: clientIdSchema,
});

export const typeTextBoxDefinition = {
  title: "Type into a TextBox",
  description: "Types text into a TextBox instance, with optional physical key press simulation.",
  inputSchema: typeTextBoxSchema,
};

export async function typeTextBoxHandler({ path, text, enter, useKeyPress, clientId }: z.infer<typeof typeTextBoxSchema>): Promise<MCPToolResult> {
  return callClient("type-text-box", { path, text, string: text, enter, useKeyPress }, { clientId });
}


export const clickButtonSchema = z.object({
  path: z
    .string()
    .describe("The instance path to the Button"),
  action: z
    .string()
    .describe("The specific signal to fire (e.g., 'Activated', 'MouseButton1Click'). If omitted, fires all standard click signals.")
    .optional(),
  clientId: clientIdSchema,
});

export const clickButtonDefinition = {
  title: "Click a GuiButton",
  description: "Simulates clicks on a TextButton or ImageButton by firing its signals via firesignal.",
  inputSchema: clickButtonSchema,
};

export async function clickButtonHandler({ path, action, clientId }: z.infer<typeof clickButtonSchema>): Promise<MCPToolResult> {
  return callClient("click-button", { path, action }, { clientId });
}
