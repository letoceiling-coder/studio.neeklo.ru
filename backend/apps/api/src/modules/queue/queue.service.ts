import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private queue!: Queue;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6383";
    this.queue = new Queue("studio-jobs", { connection: { url: redisUrl } });
    this.logger.log("BullMQ queue initialized");
  }

  async enqueue(jobId: string, kind: string, input: Record<string, unknown>) {
    await this.queue.add(
      kind,
      { jobId, input },
      { jobId, removeOnComplete: 100, removeOnFail: 200 },
    );
  }
}
