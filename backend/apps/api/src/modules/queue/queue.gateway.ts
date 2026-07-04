import { Logger, type OnModuleDestroy } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  REALTIME_CHANNEL,
  type RealtimeEnvelope,
  type WsClientMessage,
  type WsServerMessage,
} from "@studio/shared";
import Redis from "ioredis";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" }, path: "/ws" })
export class QueueGateway implements OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(QueueGateway.name);
  private sub?: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  /** Аутентифицируем сокет по токену из handshake и кладём в комнату user:<id>. */
  async handleConnection(client: Socket) {
    // Подписка на Redis-шину инициализируется один раз (server готов после первого подключения).
    this.ensureRedisBridge();

    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined);
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET,
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      // анонимный сокет: останется без user-комнаты
    }
  }

  private ensureRedisBridge() {
    if (this.sub) return;
    this.sub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6383");
    this.sub.subscribe(REALTIME_CHANNEL).catch((err) => {
      this.logger.warn(`realtime subscribe failed: ${(err as Error).message}`);
    });
    this.sub.on("message", (_channel, raw) => {
      try {
        const { userId, message } = JSON.parse(raw) as RealtimeEnvelope;
        this.server.to(`user:${userId}`).emit("event", message);
      } catch {
        /* ignore malformed */
      }
    });
  }

  async onModuleDestroy() {
    await this.sub?.quit().catch(() => undefined);
  }

  @SubscribeMessage("message")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsClientMessage,
  ) {
    if (data.type === "subscribe") {
      for (const ch of data.channels) client.join(ch);
      return { ok: true, subscribed: data.channels };
    }
    if (data.type === "unsubscribe") {
      for (const ch of data.channels) client.leave(ch);
      return { ok: true, unsubscribed: data.channels };
    }
  }

  /** Прямой emit (в рамках процесса API). */
  emitJobUpdate(userId: string, message: WsServerMessage) {
    this.server.to(`user:${userId}`).to("queue").emit("event", message);
  }
}
