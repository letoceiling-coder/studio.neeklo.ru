import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { JobKind } from "@prisma/client";
import { CreditsService } from "../credits/credits.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { QueueService } from "../queue/queue.service.js";
import { RealtimePublisher } from "../queue/realtime.publisher.js";

const VALID_KINDS = new Set<string>([
  "image",
  "video",
  "enhance",
  "realtime",
  "avatar",
  "voice",
  "site",
  "assistant",
  "parser",
]);

@Injectable()
export class JobsService {
  private readonly logger = new Logger("Jobs");

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async create(
    userId: string,
    kind: string,
    input: Record<string, unknown>,
    title?: string,
  ) {
    if (!VALID_KINDS.has(kind)) {
      throw new BadRequestException(`Unknown job type: ${kind}`);
    }

    const model = typeof input.model === "string" ? input.model : "-";
    this.logger.log(
      `create REQUEST user=${userId} kind=${kind} model=${model} promptLen=${String(input.prompt ?? "").length}`,
    );

    // Идемпотентность: повторный submit с тем же ключом (двойной клик / ретрай сети)
    // не создаёт второй job — возвращаем уже существующий активный.
    const idem = typeof input.idempotencyKey === "string" ? input.idempotencyKey : undefined;
    if (idem) {
      const existing = await this.prisma.job.findFirst({
        where: {
          userId,
          status: { in: ["queued", "running"] },
          createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
          input: { path: ["idempotencyKey"], equals: idem },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        this.logger.warn(
          `create IDEMPOTENT-HIT user=${userId} key=${idem} -> existing job=${existing.id} (no new job, no charge)`,
        );
        return existing;
      }
    }

    const cost = this.estimateCost(kind as JobKind, input);
    // Hold кредита: списываем при постановке. Если job не создался/не встал в очередь —
    // кредиты возвращаются ниже. Если упадёт у провайдера — возврат делает worker.
    await this.credits.consume(userId, cost);

    let job;
    try {
      const mergedInput = { ...input, title };
      job = await this.prisma.job.create({
        data: {
          userId,
          kind: kind as JobKind,
          cost,
          input: mergedInput,
          status: "queued",
        },
      });
      await this.queue.enqueue(job.id, kind, mergedInput);
      this.logger.log(`create OK job=${job.id} kind=${kind} cost=${cost} -> queued+enqueued`);
    } catch (err) {
      // Откатываем hold: job не поставлен в очередь.
      this.logger.error(
        `create FAILED user=${userId} kind=${kind} cost=${cost} — refunding hold: ${
          err instanceof Error ? err.message : err
        }`,
      );
      await this.credits.grant(userId, cost).catch(() => undefined);
      if (job) {
        await this.prisma.job
          .update({
            where: { id: job.id },
            data: { status: "failed", error: "Не удалось поставить задачу в очередь" },
          })
          .catch(() => undefined);
      }
      throw err;
    }

    void this.realtime.publish(userId, {
      type: "job.updated",
      job: {
        id: job.id,
        kind: job.kind,
        status: job.status,
        progress: job.progress,
        title,
      },
    });
    return job;
  }

  async get(userId: string, id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, userId } });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  private estimateCost(kind: JobKind, input: Record<string, unknown>): number {
    if (kind === "video") return Number(input.cost ?? 8);
    if (kind === "image") return Number(input.cost ?? 2);
    if (kind === "site") return Number(input.cost ?? 4);
    return 1;
  }
}
