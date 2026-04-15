import { z } from "zod";
import { callClient } from "../bridge/transport.js";
import type { MCPToolResult } from "../bridge/types.js";
import { clientIdSchema } from "./execution.js";


export const getScriptContentSchema = z.object({
  scriptGetterSource: z
    .string()
    .describe(
      "The code that fetches the script object from the game (should return a script object, and MUST be client-side only, will not work on Scripts with RunContext set to Server)"
    )
    .optional(),
  scriptPath: z
    .string()
    .describe("The path to the script to get the content of. If passing a GC'd script proxy (e.g. <ScriptProxy: 1_316566>), use the literal angle brackets < > — do NOT HTML-encode them as &lt; or &gt;.")
    .optional(),
  startLine: z
    .number()
    .describe("Optional start line number (1-based) to return only a range of lines from the decompiled script. If omitted, returns the full script.")
    .optional(),
  endLine: z
    .number()
    .describe("Optional end line number (1-based, inclusive) to return only a range of lines. Defaults to end of script if startLine is set but endLine is omitted.")
    .optional(),
  clientId: clientIdSchema,
});

export const getScriptContentDefinition = {
  title: "Get the content of a script in the Roblox Game Client",
  description: "Get the content of a script in the Roblox Game Client",
  inputSchema: getScriptContentSchema,
};

export async function getScriptContentHandler({ scriptGetterSource, scriptPath, startLine, endLine, clientId }: z.infer<typeof getScriptContentSchema>): Promise<MCPToolResult> {
  if (scriptGetterSource === undefined && scriptPath === undefined) {
    return {
      content: [{ type: "text", text: "Must provide either scriptGetterSource or scriptPath." }],
      isError: true,
    };
  } else if (scriptGetterSource !== undefined && scriptPath !== undefined) {
    return {
      content: [{ type: "text", text: "Must provide either scriptGetterSource or scriptPath, not both." }],
      isError: true,
    };
  }

  const scriptProxyMatch = (scriptPath ?? scriptGetterSource ?? "").match(/^<ScriptProxy: (.+)>$/);

  const data = scriptProxyMatch
    ? { debugId: scriptProxyMatch[1], startLine, endLine }
    : {
        source:
          scriptGetterSource === undefined
            ? `return ${scriptPath}`
            : scriptGetterSource,
        startLine,
        endLine,
      };

  return callClient("get-script-content", data as Record<string, unknown>, { clientId });
}


export const searchInstancesSchema = z.object({
  selector: z
    .string()
    .describe(
      "The selector string to filter instances (e.g., 'Part', '.Tagged', '#InstanceName', '[CanCollide = false]', 'Model >> Part.Glowing')"
    ),
  root: z
    .string()
    .describe(
      "The root instance to search from (e.g., 'game.Workspace', 'game.ReplicatedStorage'). Defaults to 'game' if not specified."
    )
    .optional()
    .default("game"),
  limit: z
    .number()
    .describe(
      "Maximum number of results to return (default: 50, to avoid overwhelming output)"
    )
    .optional()
    .default(50),
  clientId: clientIdSchema,
});

export const searchInstancesDefinition = {
  title: "Search for instances in the game",
  description: `Search for instances in the Roblox game using QueryDescendants with a CSS-like selector syntax. Supports class names (Part), tags (.Tag), names (#Name), properties ([Property = value]), attributes ([$Attribute = value]), combinators (>, >>), and pseudo-classes (:not(), :has()).

SELECTOR SYNTAX:
- ClassName: Matches instances of a class (uses IsA, so 'BasePart' matches Part, MeshPart, etc.). Example: Part, SpotLight, Model
- .Tag: Matches instances with a CollectionService tag. Example: .Fruit, .Enemy, .Interactable
- #Name: Matches instances by their Name property. Example: #HumanoidRootPart, #Head, #Torso
- [Property = value]: Matches instances where a property equals a value (boolean, number, string). Example: [CanCollide = false], [Transparency = 1], [Name = Folder10]
- [$Attribute = value]: Matches instances with a specific attribute value. Example: [$Health = 100], [$IsEnemy = true]
- [$Attribute]: Matches instances that have the attribute set (any value). Example: [$QuestId]

COMBINATORS:
- > : Direct children only. Example: Model > Part (Parts that are direct children of a Model)
- >> : All descendants (default). Example: Model >> Part (Parts anywhere inside a Model)
- , : Multiple selectors (OR). Example: Part, MeshPart (matches either)

PSEUDO-CLASSES:
- :not(selector): Excludes matches. Example: BasePart:not([CanCollide = true]) - parts with CanCollide false
- :has(selector): Matches if containing a descendant. Example: Model:has(> Humanoid) - Models with a Humanoid child

COMBINING SELECTORS: Chain selectors for AND logic. Example: Part.Tagged[Anchored = false] - Parts with tag "Tagged" that are unanchored`,
  inputSchema: searchInstancesSchema,
};

export async function searchInstancesHandler({ selector, root, limit, clientId }: z.infer<typeof searchInstancesSchema>): Promise<MCPToolResult> {
  return callClient("search-instances", { selector, root, limit }, { clientId });
}


export const getDescendantsTreeSchema = z.object({
  root: z
    .string()
    .describe(
      "The instance path to get the tree from (e.g., 'game.Workspace', 'game.Workspace.CurrentRooms')"
    ),
  maxDepth: z
    .number()
    .describe(
      "Maximum depth to traverse (default: 3). Higher values return more detail but larger output."
    )
    .optional()
    .default(3),
  classFilter: z
    .string()
    .describe(
      "Optional class name filter — only show instances that IsA this class (e.g., 'BasePart', 'Model'). Leave empty to show all."
    )
    .optional(),
  maxChildren: z
    .number()
    .describe(
      "Maximum number of children to show per node (default: 50). Prevents overwhelming output for large containers."
    )
    .optional()
    .default(50),
  clientId: clientIdSchema,
});

export const getDescendantsTreeDefinition = {
  title: "Get the descendants tree of a Roblox instance",
  description:
    "Returns a structured hierarchy tree of an instance's descendants, showing names, class types, and nesting. Useful for exploring game structure without writing custom Lua. Results are depth-limited and optionally filtered by class.",
  inputSchema: getDescendantsTreeSchema,
};

export async function getDescendantsTreeHandler({ root, maxDepth, classFilter, maxChildren, clientId }: z.infer<typeof getDescendantsTreeSchema>): Promise<MCPToolResult> {
  return callClient("get-descendants-tree", {
    root,
    maxDepth,
    classFilter: classFilter || "",
    maxChildren,
  }, { clientId });
}


export const scriptGrepSchema = z.object({
  query: z
    .string()
    .describe(
      "The search pattern. Supports standard regex syntax (Perl/PCRE2): \\d, \\w, \\s, \\b, character classes [a-z], alternation (foo|bar), quantifiers (+, *, ?), groups, lookaheads, etc. Use the literal flag for exact string matching."
    ),
  limit: z
    .number()
    .describe(
      "Maximum number of scripts to return results from (default: 50)"
    )
    .optional()
    .default(50),
  contextLines: z
    .number()
    .describe(
      "Number of lines of context to show before and after each match (default: 2)"
    )
    .optional()
    .default(2),
  maxMatchesPerScript: z
    .number()
    .describe(
      "Maximum number of matches to return per script (default: 20)"
    )
    .optional()
    .default(20),
  maxResults: z
    .number()
    .describe(
      "Maximum total number of matches across ALL scripts (default: unlimited). Use this to cap total matches, e.g. maxResults=1 to find just the first match."
    )
    .optional(),
  literal: z
    .boolean()
    .describe(
      "When true, treats the query as a plain literal string — no regex interpretation. Equivalent to grep -F / ripgrep -F. (default: false)"
    )
    .optional()
    .default(false),
  caseSensitive: z
    .boolean()
    .describe(
      "When false, matches case-insensitively. Equivalent to grep -i. (default: true)"
    )
    .optional()
    .default(true),
  clientId: clientIdSchema,
});

export const scriptGrepDefinition = {
  title: "Grep across all scripts in the game",
  description:
    'Search across all decompiled scripts in the game using standard regex syntax (Perl/PCRE2). Supports patterns like \\bRemoteEvent\\b, \\w+Service, function\\s+\\w+, lookaheads, alternation (foo|bar), etc. Use the literal flag for plain string matching. IMPORTANT: If a script instance has already been garbage collected, a "<ScriptProxy: DebugId>" string will be returned instead of the script instance path.',
  inputSchema: scriptGrepSchema,
};

export async function scriptGrepHandler({ query, limit, contextLines, maxMatchesPerScript, maxResults, literal, caseSensitive, clientId }: z.infer<typeof scriptGrepSchema>): Promise<MCPToolResult> {
  return callClient("script-grep", {
    query,
    limit,
    contextLines,
    maxMatchesPerScript,
    maxResults,
    literal,
    caseSensitive,
  }, { clientId });
}
