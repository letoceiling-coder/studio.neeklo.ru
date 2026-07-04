import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { JobsController } from "./jobs.controller.js";
import { JobsService } from "./jobs.service.js";

@Module({
  imports: [AuthModule, CreditsModule, QueueModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
