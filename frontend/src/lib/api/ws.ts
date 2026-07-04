/**
 * Realtime-канал поверх socket.io (backend gateway path `/ws`).
 * Аутентификация — access-token в handshake.auth. Сервер кладёт сокет в
 * комнату user:<id> и шлёт события "event".
 */
import { io, type Socket } from "socket.io-client";
import { getToken } from "./client";

export type WsJobPayload = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  title?: string;
  error?: string;
  output?: unknown;
};

export type RealtimeMessage =
  | { type: "job.updated"; job: WsJobPayload }
  | { type: "job.completed"; job: WsJobPayload; assetUrl?: string }
  | { type: "job.failed"; job: WsJobPayload }
  | { type: "credits.changed"; balance: number; planId: string }
  | { type: "site.run.step"; siteId: string; step: string; progress: number }
  | { type: "site.run.done"; siteId: string; publishedUrl?: string }
  | { type: "publish.status"; siteId: string; status: string }
  | { type: "assistant.message.delta"; assistantId: string; messageId: string; delta: string }
  | { type: "assistant.message.done"; assistantId: string; messageId: string; text: string }
  | { type: "lead.created"; assistantId: string; leadId: string };

type Handler = (msg: RealtimeMessage) => void;

let socket: Socket | null = null;
const handlers = new Set<Handler>();

export function connectRealtime(): void {
  if (typeof window === "undefined") return;
  const token = getToken();
  if (!token) return;
  if (socket?.connected) return;

  socket?.disconnect();
  socket = io(window.location.origin, {
    path: "/ws",
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
  });

  socket.on("event", (msg: RealtimeMessage) => {
    handlers.forEach((h) => h(msg));
  });
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

export function onRealtime(cb: Handler): () => void {
  handlers.add(cb);
  return () => handlers.delete(cb);
}
