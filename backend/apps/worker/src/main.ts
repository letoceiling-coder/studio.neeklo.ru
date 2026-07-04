import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import Redis from "ioredis";
import { elevenTts } from "./providers/elevenlabs.js";
import { falImage, falVideo } from "./providers/fal.js";
import { heygenAvatar } from "./providers/heygen.js";
import {
  REPLICATE_IMAGE_MODEL,
  REPLICATE_TTS_MODEL,
  REPLICATE_VIDEO_MODEL,
  replicateRun,
} from "./providers/replicate.js";
import { resolveImageUrl, savePublicFile } from "./providers/storage.js";

// aspect_ratio, поддерживаемые flux (REPLICATE_IMAGE_MODEL по умолчанию).
const FLUX_ASPECT = new Set(["1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "9:16", "9:21"]);

// Выбор провайдера по модальности (можно переопределить через env).
const PROVIDER = {
  image: process.env.GEN_IMAGE_PROVIDER ?? "replicate",
  video: process.env.GEN_VIDEO_PROVIDER ?? "replicate",
  voice: process.env.GEN_VOICE_PROVIDER ?? "replicate",
};

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6383";

// Должно совпадать с packages/shared/src/ws-events.ts (REALTIME_CHANNEL).
const REALTIME_CHANNEL = "studio:events";
const pub = new Redis(redisUrl);

type WsJobPayload = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  title?: string;
  error?: string;
  output?: unknown;
};

async function emit(
  userId: string,
  message:
    | { type: "job.updated"; job: WsJobPayload }
    | { type: "job.completed"; job: WsJobPayload; assetUrl?: string }
    | { type: "job.failed"; job: WsJobPayload }
    | { type: "credits.changed"; balance: number; planId: string },
) {
  if (!userId) return;
  try {
    await pub.publish(REALTIME_CHANNEL, JSON.stringify({ userId, message }));
  } catch {
    /* best-effort realtime */
  }
}

type GenResult = { url: string; output: unknown };

/** Единый структурированный лог воркера: [worker] <jobId> <msg>. */
function wlog(jobId: string, msg: string) {
  console.log(`[worker] ${new Date().toISOString()} job=${jobId} ${msg}`);
}

async function dispatch(
  kind: string,
  jobId: string,
  input: Record<string, unknown>,
  onProgress: (p: number) => void,
): Promise<GenResult> {
  const prompt = String(input.prompt ?? "");
  switch (kind) {
    case "image":
    case "enhance": {
      if (PROVIDER.image === "fal") {
        const r = await falImage(input);
        return { url: r.url, output: r.raw };
      }
      const iinput: Record<string, unknown> = { prompt };
      const fmt = String(input.format ?? "");
      if (FLUX_ASPECT.has(fmt)) iinput.aspect_ratio = fmt;
      const r = await replicateRun(REPLICATE_IMAGE_MODEL, iinput, onProgress);
      return { url: r.url, output: r.raw };
    }
    case "video":
    case "realtime": {
      if (PROVIDER.video === "fal") {
        const r = await falVideo(input, onProgress);
        return { url: r.url, output: r.raw };
      }
      const vinput: Record<string, unknown> = { prompt };
      // Стартовый кадр (Фото→видео / Старт+Финал): data:URL → сохраняем в /uploads → URL.
      // first_frame_image — валидное поле minimax/video-01; финальный кадр текущая
      // модель не поддерживает, поэтому его НЕ шлём (иначе провайдер вернёт 422).
      const start = await resolveImageUrl(input.startFrame, `${jobId}-start`);
      if (start) vinput.first_frame_image = start;
      const r = await replicateRun(REPLICATE_VIDEO_MODEL, vinput, onProgress);
      return { url: r.url, output: r.raw };
    }
    case "voice": {
      const text = String(input.text ?? input.prompt ?? "");
      if (PROVIDER.voice === "elevenlabs") {
        const audio = await elevenTts(input);
        const url = await savePublicFile(`${jobId}.mp3`, audio);
        return { url, output: { url, bytes: audio.length } };
      }
      const r = await replicateRun(REPLICATE_TTS_MODEL, { text }, onProgress);
      return { url: r.url, output: r.raw };
    }
    case "avatar": {
      const r = await heygenAvatar(input, onProgress);
      return { url: r.url, output: r.raw };
    }
    default:
      throw new Error(`Unsupported job kind: ${kind}`);
  }
}

const worker = new Worker(
  "studio-jobs",
  async (job) => {
    const { jobId, input } = job.data as {
      jobId: string;
      input: Record<string, unknown>;
    };
    const kind = job.name;

    const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
    const userId = dbJob?.userId ?? "";
    const title = (input.title as string | undefined) ?? undefined;

    wlog(jobId, `RECEIVED kind=${kind} user=${userId} cost=${dbJob?.cost ?? 0} model=${String(input.model ?? "-")}`);

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "running", startedAt: new Date(), progress: 0.1 },
    });
    wlog(jobId, "RUNNING");
    void emit(userId, {
      type: "job.updated",
      job: { id: jobId, kind, status: "running", progress: 0.1, title },
    });

    try {
      const result = await dispatch(kind, jobId, input, (p) => {
        void prisma.job.update({ where: { id: jobId }, data: { progress: p } });
        void emit(userId, {
          type: "job.updated",
          job: { id: jobId, kind, status: "running", progress: p, title },
        });
      });

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 1,
          finishedAt: new Date(),
          output: result.output as never,
        },
      });
      wlog(jobId, `COMPLETED url=${result.url}`);
      void emit(userId, {
        type: "job.completed",
        job: {
          id: jobId,
          kind,
          status: "completed",
          progress: 1,
          title,
          output: result.output,
        },
        assetUrl: result.url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "failed", error: message, finishedAt: new Date() },
      });
      wlog(jobId, `FAILED error="${message}"`);
      // Возврат кредитов (hold → возврат): генерация не состоялась по вине провайдера/модели.
      const refund = dbJob?.cost ?? 0;
      if (userId && refund > 0) {
        try {
          const u = await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: refund } },
          });
          wlog(jobId, `REFUND user=${userId} amount=${refund} ->${u.credits}`);
          void emit(userId, {
            type: "credits.changed",
            balance: u.credits,
            planId: u.planId,
          });
        } catch {
          /* возврат best-effort */
        }
      }
      void emit(userId, {
        type: "job.failed",
        job: { id: jobId, kind, status: "failed", progress: 1, title, error: message },
      });
      throw err;
    }
  },
  {
    connection: { url: redisUrl },
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  },
);

worker.on("ready", () => console.log("Studio worker ready"));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
