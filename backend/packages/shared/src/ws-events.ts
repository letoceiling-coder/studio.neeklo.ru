import type { JobKind, JobStatus } from "./index.js";

export type WsChannel = "queue" | "credits";

export type WsClientMessage =
  | { type: "subscribe"; channels: WsChannel[] }
  | { type: "unsubscribe"; channels: WsChannel[] };

export type WsJobPayload = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  progress: number;
  title?: string;
  error?: string;
  output?: unknown;
};

export type WsServerMessage =
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

/** Конверт для межпроцессной шины (Redis pub/sub): API и worker → шлюз. */
export type RealtimeEnvelope = {
  userId: string;
  message: WsServerMessage;
};

export const REALTIME_CHANNEL = "studio:events";
