import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { IsEmail, IsString, MinLength } from "class-validator";
import type { FastifyReply, FastifyRequest } from "fastify";
import "@fastify/cookie";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

class SignupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("signup")
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.signup(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const result = await this.auth.login(dto);
    if (!result) throw new UnauthorizedException("Invalid credentials");
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post("refresh")
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = req.cookies?.["refresh_token"];
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post("telegram")
  async telegram(
    @Body() payload: Record<string, unknown>,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.auth.telegram(payload as never);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  // Привязка Telegram к текущему аккаунту (быстрый вход), только для залогиненных.
  @Post("telegram/link")
  @UseGuards(JwtAuthGuard)
  async telegramLink(
    @CurrentUser() user: AuthUser,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.auth.linkTelegram(user.userId, payload as never);
  }

  @Post("telegram/unlink")
  @UseGuards(JwtAuthGuard)
  async telegramUnlink(@CurrentUser() user: AuthUser) {
    return this.auth.unlinkTelegram(user.userId);
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie("refresh_token", { path: "/api/auth" });
    return { ok: true };
  }

  private setRefreshCookie(res: FastifyReply, token: string) {
    res.setCookie("refresh_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
