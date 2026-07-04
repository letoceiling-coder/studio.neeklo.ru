import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { LlmModule } from "../llm/llm.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { AssistantsController } from "./assistants.controller.js";
import { AssistantsService } from "./assistants.service.js";

@Module({
  imports: [AuthModule, CreditsModule, QueueModule, LlmModule],
  controllers: [AssistantsController],
  providers: [AssistantsService],
})
export class AssistantsModule {}
