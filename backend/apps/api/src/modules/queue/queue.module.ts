import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { QueueGateway } from "./queue.gateway.js";
import { QueueService } from "./queue.service.js";
import { RealtimePublisher } from "./realtime.publisher.js";

@Module({
  imports: [AuthModule],
  providers: [QueueService, QueueGateway, RealtimePublisher],
  exports: [QueueService, QueueGateway, RealtimePublisher],
})
export class QueueModule {}
