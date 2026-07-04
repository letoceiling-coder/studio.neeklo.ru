import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsInt, Min } from "class-validator";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CreditsService } from "./credits.service.js";

class ConsumeDto {
  @IsInt()
  @Min(1)
  amount!: number;
}

@Controller("credits")
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.credits.getBalance(user.userId);
  }

  @Post("consume")
  consume(@CurrentUser() user: AuthUser, @Body() dto: ConsumeDto) {
    return this.credits.consume(user.userId, dto.amount);
  }
}
