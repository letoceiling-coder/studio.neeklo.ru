import { apiFetch } from "./client";
import { onRealtime } from "./ws";

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

export type Job = {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  output?: unknown;
  error?: string;
};

/** Создаёт серверную задачу генерации. Кредиты списываются на бэке. */
export async function createJob(
  kind: JobKind,
  input: Record<string, unknown>,
  title?: string,
): Promise<Job> {
  return apiFetch<Job>(`/jobs/${kind}`, {
    method: "POST",
    body: { input, title },
  });
}

export async function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`);
}

export type JobResult = {
  status: "completed" | "failed";
  assetUrl?: string;
  output?: unknown;
  error?: string;
};

/**
 * Запускает задачу и ждёт результат через realtime (WS) с фолбэком на polling.
 * onProgress получает прогресс 0..1. Возвращает финал (completed/failed).
 */
export async function runJob(
  kind: JobKind,
  input: Record<string, unknown>,
  opts: { title?: string; onProgress?: (p: number) => void } = {},
): Promise<JobResult> {
  const job = await createJob(kind, input, opts.title);
  const jobId = job.id;

  return new Promise<JobResult>((resolve) => {
    let settled = false;
    const finish = (r: JobResult) => {
      if (settled) return;
      settled = true;
      off();
      clearInterval(poll);
      resolve(r);
    };

    const off = onRealtime((msg) => {
      if (msg.type === "job.updated" && msg.job.id === jobId) {
        opts.onProgress?.(msg.job.progress ?? 0);
      } else if (msg.type === "job.completed" && msg.job.id === jobId) {
        finish({ status: "completed", assetUrl: msg.assetUrl, output: msg.job.output });
      } else if (msg.type === "job.failed" && msg.job.id === jobId) {
        finish({ status: "failed", error: msg.job.error });
      }
    });

    // Фолбэк-поллинг на случай пропущенного WS-события.
    const poll = setInterval(async () => {
      try {
        const j = await getJob(jobId);
        opts.onProgress?.(j.progress ?? 0);
        if (j.status === "completed") {
          const url = extractUrl(j.output);
          finish({ status: "completed", assetUrl: url, output: j.output });
        } else if (j.status === "failed") {
          finish({ status: "failed", error: j.error });
        }
      } catch {
        /* транзиентная ошибка — ждём следующего тика */
      }
    }, 4000);

    // Защитный таймаут (10 минут).
    setTimeout(() => finish({ status: "failed", error: "timeout" }), 10 * 60 * 1000);
  });
}

function extractUrl(output: unknown): string | undefined {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    for (const v of output) {
      const u = extractUrl(v);
      if (u) return u;
    }
  }
  if (output && typeof output === "object") {
    for (const k of ["url", "audio", "video", "image"]) {
      const u = extractUrl((output as Record<string, unknown>)[k]);
      if (u) return u;
    }
  }
  return undefined;
}
