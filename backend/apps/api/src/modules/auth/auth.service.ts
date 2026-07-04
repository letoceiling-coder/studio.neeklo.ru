import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service.js";
import { createHash, createHmac, randomBytes } from "node:crypto";

type TelegramAuthPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
  [key: string]: unknown;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: { name: string; email: string; password: string }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash,
      },
    });
    return this.issueTokens(user.id, user.email, user.name, user.planId, user.role);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user) return null;
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) return null;
    return this.issueTokens(user.id, user.email, user.name, user.planId, user.role);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException("Invalid refresh token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException("User not found");
    // rotate: одноразовый refresh-токен
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(user.id, user.email, user.name, user.planId, user.role);
  }

  async telegram(payload: TelegramAuthPayload) {
    const telegramId = this.assertValidTelegram(payload);
    const name =
      [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim() ||
      payload.username ||
      "Telegram user";

    const existing = await this.prisma.user.findUnique({ where: { telegramId } });
    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          telegramId,
          name,
          email: `tg-${telegramId}@telegram.neeklo`,
          passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 12),
          avatarUrl: payload.photo_url ?? null,
        },
      }));

    return this.issueTokens(user.id, user.email, user.name, user.planId, user.role);
  }

  /** Привязать Telegram к уже залогиненному аккаунту (быстрый вход). */
  async linkTelegram(userId: string, payload: TelegramAuthPayload) {
    const telegramId = this.assertValidTelegram(payload);
    const owner = await this.prisma.user.findUnique({ where: { telegramId } });
    if (owner && owner.id !== userId) {
      throw new ConflictException(
        "Этот Telegram уже привязан к другому аккаунту",
      );
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        ...(payload.photo_url ? { avatarUrl: payload.photo_url } : {}),
      },
    });
    return { telegramId: user.telegramId };
  }

  /** Отвязать Telegram от аккаунта. */
  async unlinkTelegram(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramId: null },
    });
    return { ok: true };
  }

  /** Проверяет подпись и срок Telegram-payload, возвращает telegramId. */
  private assertValidTelegram(payload: TelegramAuthPayload): string {
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
    if (!botToken) throw new UnauthorizedException("Telegram login is not configured");
    if (!this.verifyTelegram(payload, botToken)) {
      throw new UnauthorizedException("Invalid Telegram signature");
    }
    const authDate = Number(payload.auth_date) * 1000;
    if (!Number.isFinite(authDate) || Date.now() - authDate > 86_400_000) {
      throw new UnauthorizedException("Telegram auth expired");
    }
    return String(payload.id);
  }

  private verifyTelegram(payload: TelegramAuthPayload, botToken: string): boolean {
    const { hash, ...rest } = payload;
    if (!hash) return false;
    const checkString = Object.keys(rest)
      .filter((k) => rest[k] !== undefined && rest[k] !== null)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join("\n");
    const secret = createHash("sha256").update(botToken).digest();
    const hmac = createHmac("sha256", secret).update(checkString).digest("hex");
    return hmac === hash;
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string,
    planId: string,
    role: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, planId, role },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as `${number}${"s" | "m" | "h" | "d"}`,
      },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const ttlDays = 30;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlDays * 864e5),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name, planId, role },
    };
  }
}
