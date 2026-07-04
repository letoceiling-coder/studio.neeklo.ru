import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { CreditsController } from "./credits.controller.js";
import { CreditsService } from "./credits.service.js";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
