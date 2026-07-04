import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { RealtimePublisher } from "../queue/realtime.publisher.js";

@Injectable()
export class CreditsService {
  private readonly logger = new Logger("Credits");

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return { balance: user.credits, planId: user.planId };
  }

  async consume(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.credits < amount) {
      this.logger.warn(
        `consume DENIED user=${userId} need=${amount} have=${user.credits} (insufficient)`,
      );
      throw new BadRequestException("Insufficient credits");
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    });
    this.logger.log(
      `consume OK user=${userId} amount=${amount} ${user.credits}->${updated.credits}`,
    );
    void this.realtime.publish(userId, {
      type: "credits.changed",
      balance: updated.credits,
      planId: updated.planId,
    });
    return { balance: updated.credits, planId: updated.planId, consumed: amount };
  }

  /** Начисление кредитов (промо, подарки, админ, оплата, возврат hold). */
  async grant(userId: string, amount: number) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: Math.max(0, amount) } },
    });
    this.logger.log(`grant OK user=${userId} amount=${amount} ->${updated.credits}`);
    void this.realtime.publish(userId, {
      type: "credits.changed",
      balance: updated.credits,
      planId: updated.planId,
    });
    return { balance: updated.credits, planId: updated.planId };
  }

  /** Жёстко выставить баланс (админ). */
  async setBalance(userId: string, balance: number) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { credits: Math.max(0, Math.floor(balance)) },
    });
    void this.realtime.publish(userId, {
      type: "credits.changed",
      balance: updated.credits,
      planId: updated.planId,
    });
    return { balance: updated.credits, planId: updated.planId };
  }
}
