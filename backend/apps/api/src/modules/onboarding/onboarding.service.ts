import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboarding: true },
    });
    return { onboarding: user?.onboarding ?? null };
  }

  async save(userId: string, data: unknown) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { onboarding: data as never },
      select: { onboarding: true },
    });
    return { onboarding: updated.onboarding };
  }
}
