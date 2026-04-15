import { z } from "zod";
import { getInstanceRole } from "../bridge/transport.js";
import { performScreenshot, enumRobloxWindows } from "../bridge/screenshot.js";
import type { MCPToolResult, ScreenshotResult, RobloxWindowInfo } from "../bridge/types.js";
import { clientIdSchema } from "./execution.js";

let BASE_URL: string | null = null;

export function setBaseUrl(url: string | null) {
  BASE_URL = url;
}


export const screenshotWindowSchema = z.object({
  pid: z
    .number()
    .describe(
      "The PID (process ID) of the Roblox window to capture. If omitted and only one Roblox window exists, it is captured automatically. If multiple windows exist and no pid is provided, the tool returns a list of windows for disambiguation."
    )
    .optional(),
  clientId: clientIdSchema,
});

export const screenshotWindowDefinition = {
  title: "Take a screenshot of a Roblox window",
  description:
    "Captures a screenshot of the Roblox game window using the Windows API (PrintWindow/GDI). " +
    "Does NOT use any Lua/Roblox API — it captures the actual OS window contents. " +
    "If multiple Roblox windows are open, specify the pid to target a specific one. " +
    "Only works on Windows. " +
    "If the MCP server is running as a secondary (with BASE_URL set), the screenshot request is relayed to the primary server — " +
    "so the primary's machine (which may be a remote Windows host) performs the actual capture, even if roblox isn't running on the machine the MCP client is on.",
  inputSchema: screenshotWindowSchema,
};

export async function screenshotWindowHandler({ pid }: z.infer<typeof screenshotWindowSchema>): Promise<MCPToolResult> {

  if (getInstanceRole() === "secondary" && BASE_URL) {
    try {
      const targetUrl = BASE_URL.replace(/\/$/, "") + "/api/screenshot";
      const body = JSON.stringify({ pid });
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = (await resp.json()) as ScreenshotResult;

      if (result.error) {
        return { content: [{ type: "text", text: result.error }], isError: true };
      }

      if (result.needsDisambiguation && result.windows) {
        const listing = result.windows
          .map((w) => `  • PID ${w.pid} — "${w.title}"`)
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text:
                "Multiple Roblox windows were found. Please re-call this tool with the `pid` parameter set to the correct process:\n\n" +
                listing,
            },
          ],
        };
      }

      if (result.imageBase64) {
        return {
          content: [
            {
              type: "image",
              data: result.imageBase64,
              mimeType: "image/png",
            },
          ],
        };
      }

      return { content: [{ type: "text", text: "Screenshot failed: unexpected response from primary." }], isError: true };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Failed to relay screenshot to primary: ${err.message || err}` }],
        isError: true,
      };
    }
  }

  if (process.platform !== "win32") {
    return {
      content: [
        {
          type: "text",
          text: "Error: The screenshot-window tool is only available on Windows. The current platform is: " + process.platform,
        },
      ],
      isError: true,
    };
  }
  try {
    const result = performScreenshot(pid);

    if (result.error) {
      return { content: [{ type: "text", text: result.error }], isError: true };
    }

    if (result.needsDisambiguation && result.windows) {
      const listing = result.windows
        .map((w) => `  • PID ${w.pid} — "${w.title}"`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text:
              "Multiple Roblox windows were found. Please re-call this tool with the `pid` parameter set to the correct process:\n\n" +
              listing,
          },
        ],
      };
    }

    if (result.imageBase64) {
      return {
        content: [
          {
            type: "image",
            data: result.imageBase64,
            mimeType: "image/png",
          },
        ],
      };
    }

    return { content: [{ type: "text", text: "Screenshot failed: unexpected result." }], isError: true };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Screenshot failed: ${err.message || err}` }],
      isError: true,
    };
  }
}


export const listRobloxWindowsSchema = z.object({
  clientId: clientIdSchema,
});

export const listRobloxWindowsDefinition = {
  title: "List visible Roblox windows",
  description:
    "Returns all visible Roblox game windows and their PIDs. Useful for disambiguating which PID to pass to the screenshot-window tool when multiple instances of Roblox are running. " +
    "If the MCP server is running as a secondary (with BASE_URL set), the request is relayed to the primary server.",
  inputSchema: listRobloxWindowsSchema,
};

export async function listRobloxWindowsHandler(): Promise<MCPToolResult> {

  if (getInstanceRole() === "secondary" && BASE_URL) {
    try {
      const targetUrl = BASE_URL.replace(/\/$/, "") + "/api/windows";
      const resp = await fetch(targetUrl);
      const result = (await resp.json()) as { windows?: RobloxWindowInfo[]; error?: string };

      if (result.error) {
        return { content: [{ type: "text", text: result.error }], isError: true };
      }

      const wins = result.windows ?? [];
      if (wins.length === 0) {
        return { content: [{ type: "text", text: "No visible Roblox windows found on the primary host." }] };
      }

      const listing = wins.map((w) => `PID ${w.pid} — "${w.title}"`).join("\n");
      return { content: [{ type: "text", text: listing }] };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Failed to relay to primary: ${err.message || err}` }],
        isError: true,
      };
    }
  }

  if (process.platform !== "win32") {
    return {
      content: [{ type: "text", text: "Window enumeration is only supported on Windows. Current platform: " + process.platform }],
      isError: true,
    };
  }

  const wins = enumRobloxWindows();
  if (wins.length === 0) {
    return { content: [{ type: "text", text: "No visible Roblox windows found." }] };
  }

  const listing = wins.map((w) => `PID ${w.pid} — "${w.title}"`).join("\n");
  return { content: [{ type: "text", text: listing }] };
}
