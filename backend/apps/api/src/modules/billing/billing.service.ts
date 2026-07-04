import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { PlanId } from "@prisma/client";
import { getPlan } from "@studio/shared";
import { CreditsService } from "../credits/credits.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TbankProvider } from "./providers/tbank.provider.js";
import type { PaymentProvider } from "./providers/provider.types.js";
import { YookassaProvider } from "./providers/yookassa.provider.js";

type ProviderName = "yookassa" | "tbank";
type Cycle = "month" | "year";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly providers: Record<ProviderName, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    yookassa: YookassaProvider,
    tbank: TbankProvider,
  ) {
    this.providers = { yookassa, tbank };
  }

  private provider(name: ProviderName): PaymentProvider {
    const p = this.providers[name];
    if (!p) throw new BadRequestException(`Unknown provider: ${name}`);
    if (!p.isConfigured()) throw new BadRequestException(`Provider ${name} is not configured`);
    return p;
  }

  private priceRub(planId: PlanId, cycle: Cycle): number {
    const plan = getPlan(planId);
    return cycle === "year" ? plan.yearlyPricePerMonth * 12 : plan.price;
  }

  async checkout(
    userId: string,
    input: { planId: PlanId; cycle?: Cycle; provider: ProviderName; returnUrl?: string },
  ) {
    const cycle: Cycle = input.cycle === "year" ? "year" : "month";
    const amountRub = this.priceRub(input.planId, cycle);
    if (amountRub <= 0) {
      throw new BadRequestException("Этот тариф нельзя оплатить (бесплатный)");
    }
    const provider = this.provider(input.provider);
    const plan = getPlan(input.planId);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        provider: provider.name,
        amount: amountRub,
        planId: input.planId,
        cycle,
        status: "pending",
      },
    });

    const returnUrl = input.returnUrl ?? "https://studio.neeklo.ru/app/billing";
    const result = await provider.createPayment({
      orderId: payment.id,
      amountRub,
      description: `neeklo ${plan.name} (${cycle === "year" ? "год" : "месяц"})`,
      returnUrl,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalId: result.externalId },
    });

    return { paymentId: payment.id, confirmationUrl: result.confirmationUrl };
  }

  async handleWebhook(
    name: ProviderName,
    body: unknown,
    headers: Record<string, string>,
  ) {
    const provider = this.provider(name);
    const result = await provider.parseWebhook(body, headers);

    const payment =
      (result.orderId
        ? await this.prisma.payment.findUnique({ where: { id: result.orderId } })
        : null) ??
      (result.externalId
        ? await this.prisma.payment.findUnique({ where: { externalId: result.externalId } })
        : null);

    if (!payment) {
      this.logger.warn(`webhook ${name}: payment not found (${result.orderId})`);
      return { ok: true };
    }

    if (result.status === "pending" || payment.status === "succeeded") {
      return { ok: true };
    }

    if (result.status === "failed") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", meta: body as never },
      });
      return { ok: true };
    }

    // succeeded → активируем подписку и квоту
    await this.activate(payment.userId, payment.planId, payment.cycle as Cycle, payment.id, body);
    return { ok: true };
  }

  private async activate(
    userId: string,
    planId: PlanId,
    cycle: Cycle,
    paymentId: string,
    raw: unknown,
  ) {
    const periodEnd = new Date(
      Date.now() + (cycle === "year" ? 365 : 30) * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: "succeeded", meta: raw as never },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { planId } }),
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          cycle,
          status: "active",
          provider: "",
          currentPeriodEnd: periodEnd,
        },
        update: { planId, cycle, status: "active", currentPeriodEnd: periodEnd },
      }),
    ]);

    // выставляем месячную квоту кредитов плана + realtime
    await this.credits.setBalance(userId, getPlan(planId).monthlyCredits);
  }

  async getMine(userId: string) {
    const [user, sub] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { planId: true, credits: true },
      }),
      this.prisma.subscription.findUnique({ where: { userId } }),
    ]);
    if (!user) throw new NotFoundException("User not found");
    return { planId: user.planId, credits: user.credits, subscription: sub };
  }

  invoices(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
