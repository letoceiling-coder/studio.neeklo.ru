import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JobsService } from "./jobs.service.js";

class CreateJobDto {
  @IsObject()
  input!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  title?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post("jobs/:type")
  create(
    @CurrentUser() user: AuthUser,
    @Param("type") type: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobs.create(user.userId, type, dto.input, dto.title);
  }

  @Get("jobs/:id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.jobs.get(user.userId, id);
  }

  @Post("generate/image")
  generateImage(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.jobs.create(user.userId, "image", body);
  }

  @Post("generate/video")
  generateVideo(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.jobs.create(user.userId, "video", body);
  }
}
