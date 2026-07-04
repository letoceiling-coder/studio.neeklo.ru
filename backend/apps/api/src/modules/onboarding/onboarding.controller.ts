import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { OnboardingService } from "./onboarding.service.js";

@Controller("onboarding")
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.onboarding.get(user.userId);
  }

  @Post()
  save(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.onboarding.save(user.userId, body);
  }
}
