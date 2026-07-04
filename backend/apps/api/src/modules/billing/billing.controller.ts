import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PLANS } from "@studio/shared";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { BillingService } from "./billing.service.js";

const PLAN_IDS = ["free", "start", "pro", "studio", "business"] as const;
const PROVIDERS = ["yookassa", "tbank"] as const;

class CheckoutDto {
  @IsIn(PLAN_IDS)
  planId!: (typeof PLAN_IDS)[number];

  @IsOptional()
  @IsIn(["month", "year"])
  cycle?: "month" | "year";

  @IsIn(PROVIDERS)
  provider!: (typeof PROVIDERS)[number];

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  plans() {
    return Object.values(PLANS);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.billing.getMine(user.userId);
  }

  @Get("invoices")
  @UseGuards(JwtAuthGuard)
  invoices(@CurrentUser() user: AuthUser) {
    return this.billing.invoices(user.userId);
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.billing.checkout(user.userId, dto);
  }

  // Вебхуки — публичные, проверка подписи внутри провайдера.
  @Post("webhook/yookassa")
  yookassaWebhook(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.billing.handleWebhook("yookassa", body, headers);
  }

  @Post("webhook/tbank")
  tbankWebhook(@Body() body: unknown, @Headers() headers: Record<string, string>) {
    return this.billing.handleWebhook("tbank", body, headers);
  }
}
