import type { WebSocket } from "ws";

export interface RobloxClient {
  clientId: string;
  username: string;
  userId: number;
  placeId: number;
  jobId: string;
  placeName: string;
  transport: "ws" | "http";
  ws?: WebSocket;
  lastHttpPoll: number;
  pendingCommandQueue: string[];
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no_client" | "invalid_client" };

export interface RobloxResponse {
  id: string;
  output?: string;
  error?: string;
  success?: boolean;
}

export interface MCPToolResult {
  content: Array<{ type: "text" | "image"; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

export interface RobloxWindowInfo {
  pid: number;
  hwnd: string;
  title: string;
}

export interface ScreenshotResult {
  error?: string;
  needsDisambiguation?: boolean;
  windows?: RobloxWindowInfo[];
  imageBase64?: string;
}

export type InstanceRole = "primary" | "secondary";
