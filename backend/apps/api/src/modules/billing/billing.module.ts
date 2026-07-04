import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { BillingController } from "./billing.controller.js";
import { BillingService } from "./billing.service.js";
import { TbankProvider } from "./providers/tbank.provider.js";
import { YookassaProvider } from "./providers/yookassa.provider.js";

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [BillingController],
  providers: [BillingService, YookassaProvider, TbankProvider],
})
export class BillingModule {}
