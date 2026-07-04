export type PlanId = "free" | "start" | "pro" | "studio" | "business";

export type JobKind =
  | "image"
  | "video"
  | "enhance"
  | "realtime"
  | "avatar"
  | "voice"
  | "site"
  | "assistant"
  | "parser";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ApiError = {
  message: string;
  code?: string;
  statusCode: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export * from "./plans.js";
export * from "./ws-events.js";
