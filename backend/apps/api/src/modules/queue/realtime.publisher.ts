import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { REALTIME_CHANNEL, type WsServerMessage } from "@studio/shared";
import Redis from "ioredis";

/** Публикует realtime-события в Redis pub/sub. Слушает их шлюз (RealtimeGateway). */
@Injectable()
export class RealtimePublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private pub!: Redis;

  onModuleInit() {
    this.pub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6383");
  }

  async onModuleDestroy() {
    await this.pub?.quit().catch(() => undefined);
  }

  async publish(userId: string, message: WsServerMessage) {
    try {
      await this.pub.publish(REALTIME_CHANNEL, JSON.stringify({ userId, message }));
    } catch (err) {
      this.logger.warn(`realtime publish failed: ${(err as Error).message}`);
    }
  }
}
