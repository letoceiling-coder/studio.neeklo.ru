// Replicate провайдер (image/video/voice). Возвращает hosted URL результата.
// Документация: https://replicate.com/docs/reference/http

function token(): string {
  return process.env.REPLICATE_API_TOKEN ?? "";
}

function ensureConfigured() {
  if (!token()) throw new Error("REPLICATE_API_TOKEN is not configured");
}

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
  urls?: { get?: string };
};

/** Находит первый URL в произвольной структуре output (string | string[] | object). */
function extractUrl(output: unknown): string | undefined {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = extractUrl(item);
      if (u) return u;
    }
    return undefined;
  }
  if (output && typeof output === "object") {
    for (const key of ["url", "audio", "video", "image", "output"]) {
      const v = (output as Record<string, unknown>)[key];
      const u = extractUrl(v);
      if (u) return u;
    }
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_SUBMIT_RETRIES = 4;

const rlog = (msg: string) =>
  console.log(`[replicate] ${new Date().toISOString()} ${msg}`);

/** Достаёт retry_after (сек) из заголовка Retry-After или тела ответа 429. */
function parseRetryAfter(res: Response, body: string): number {
  const header = res.headers.get("retry-after");
  if (header && Number.isFinite(Number(header))) return Math.max(1, Number(header));
  try {
    const j = JSON.parse(body) as { retry_after?: number };
    if (j && Number.isFinite(Number(j.retry_after))) return Math.max(1, Number(j.retry_after));
  } catch {
    /* not json */
  }
  return 3;
}

/** Короткое человекочитаемое сообщение из тела ошибки (без сырого JSON-дампа). */
function shortError(body: string): string {
  try {
    const j = JSON.parse(body) as { detail?: string; title?: string; error?: string };
    const msg = j.detail ?? j.title ?? j.error;
    if (msg) return String(msg).split(".")[0].slice(0, 140);
  } catch {
    /* not json */
  }
  return body.replace(/\s+/g, " ").slice(0, 140);
}

/**
 * Создаёт prediction с учётом rate-limit (429 → retry_after, до MAX_SUBMIT_RETRIES попыток).
 * Бросает ЧИСТЫЕ, понятные пользователю ошибки (без сырого JSON провайдера).
 */
async function submitPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<Prediction> {
  for (let attempt = 0; attempt <= MAX_SUBMIT_RETRIES; attempt++) {
    rlog(`submit model=${model} attempt=${attempt + 1}/${MAX_SUBMIT_RETRIES + 1}`);
    const res = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ input }),
      },
    );
    if (res.ok) {
      rlog(`submit OK model=${model} status=${res.status}`);
      return (await res.json()) as Prediction;
    }

    const body = await res.text();

    if (res.status === 429) {
      const wait = parseRetryAfter(res, body);
      rlog(`429 RATE-LIMITED model=${model} retry_after=${wait}s attempt=${attempt + 1}`);
      if (attempt < MAX_SUBMIT_RETRIES) {
        await sleep((wait + 0.5) * 1000);
        continue;
      }
      rlog(`429 GIVE-UP model=${model} after ${MAX_SUBMIT_RETRIES + 1} attempts`);
      throw new Error(
        "Сервис генерации временно перегружен. Повторите через минуту или выберите другую модель.",
      );
    }
    if (res.status === 402) {
      throw new Error(
        "На балансе провайдера генерации недостаточно средств — сообщите администратору.",
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Провайдер генерации не настроен (ключ доступа).");
    }
    if (res.status >= 500 && attempt < MAX_SUBMIT_RETRIES) {
      rlog(`5xx model=${model} status=${res.status} retrying`);
      await sleep(2000);
      continue;
    }
    rlog(`submit ERROR model=${model} status=${res.status} body=${shortError(body)}`);
    throw new Error(`Модель временно недоступна (код ${res.status}). ${shortError(body)}`.trim());
  }
  throw new Error("Не удалось запустить генерацию. Попробуйте позже.");
}

/** Запускает модель Replicate (owner/name) и дожидается результата. */
export async function replicateRun(
  model: string,
  input: Record<string, unknown>,
  onProgress?: (p: number) => void,
): Promise<{ url: string; raw: unknown }> {
  ensureConfigured();

  let pred = await submitPrediction(model, input);

  const getUrl = pred.urls?.get;
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts && !["succeeded", "failed", "canceled"].includes(pred.status); i++) {
    await sleep(3000);
    if (!getUrl) break;
    const st = await fetch(getUrl, { headers: { Authorization: `Bearer ${token()}` } });
    if (!st.ok) {
      // 429 при опросе — подождём подольше и продолжим
      if (st.status === 429) await sleep(3000);
      continue;
    }
    pred = (await st.json()) as Prediction;
    if (onProgress) onProgress(Math.min(0.9, 0.3 + (i / maxAttempts) * 0.6));
  }

  if (pred.status !== "succeeded") {
    const reason = pred.error ? shortError(JSON.stringify(pred.error)) : pred.status;
    rlog(`predict FAILED model=${model} status=${pred.status} reason=${reason}`);
    throw new Error(`Генерация не удалась: ${reason}`);
  }
  const url = extractUrl(pred.output);
  if (!url) {
    rlog(`predict NO-URL model=${model}`);
    throw new Error("Модель не вернула результат. Попробуйте другую модель.");
  }
  rlog(`predict SUCCESS model=${model}`);
  return { url, raw: pred.output };
}

export const REPLICATE_IMAGE_MODEL =
  process.env.REPLICATE_IMAGE_MODEL ?? "black-forest-labs/flux-schnell";
export const REPLICATE_VIDEO_MODEL =
  process.env.REPLICATE_VIDEO_MODEL ?? "minimax/video-01";
export const REPLICATE_TTS_MODEL =
  process.env.REPLICATE_TTS_MODEL ?? "minimax/speech-02-hd";
