import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { SitesService } from "./sites.service.js";

class CreateSiteDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;
}

class AgentDto {
  @IsString()
  prompt!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsString()
  mode?: "agent" | "plan" | "ask";
}

@Controller("sites")
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.sites.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSiteDto) {
    return this.sites.create(user.userId, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.sites.get(user.userId, id);
  }

  @Post(":id/agent")
  agent(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: AgentDto,
  ) {
    return this.sites.runAgent(user.userId, id, dto);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.sites.publish(user.userId, id);
  }
}
