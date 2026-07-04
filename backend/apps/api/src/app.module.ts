import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./modules/admin/admin.module.js";
import { AssistantsModule } from "./modules/assistants/assistants.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BillingModule } from "./modules/billing/billing.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { CreditsModule } from "./modules/credits/credits.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { LlmModule } from "./modules/llm/llm.module.js";
import { OnboardingModule } from "./modules/onboarding/onboarding.module.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { QueueModule } from "./modules/queue/queue.module.js";
import { SitesModule } from "./modules/sites/sites.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CreditsModule,
    JobsModule,
    OnboardingModule,
    QueueModule,
    SitesModule,
    AdminModule,
    BillingModule,
    ContentModule,
    LlmModule,
    AssistantsModule,
  ],
})
export class AppModule {}
