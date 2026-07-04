import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return this.serialize(user);
  }

  async update(userId: string, patch: { name?: string; avatarUrl?: string | null }) {
    const data: { name?: string; avatarUrl?: string | null } = {};
    if (typeof patch.name === "string" && patch.name.trim()) {
      data.name = patch.name.trim();
    }
    if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return this.serialize(user);
  }

  private serialize(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    planId: string;
    credits: number;
    avatarUrl: string | null;
    telegramId: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planId: user.planId,
      credits: user.credits,
      avatarUrl: user.avatarUrl,
      telegramId: user.telegramId,
      createdAt: user.createdAt,
    };
  }
}
