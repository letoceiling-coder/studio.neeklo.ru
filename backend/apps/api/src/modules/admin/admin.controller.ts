import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { SuperAdminGuard } from "../../common/roles.guard.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AdminService } from "./admin.service.js";

const ROLES = ["user", "admin", "superadmin"] as const;
const PLAN_IDS = ["free", "start", "pro", "studio", "business"] as const;

class UpdateUserDto {
  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsIn(PLAN_IDS)
  planId?: (typeof PLAN_IDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

class CreditsDto {
  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsInt()
  balance?: number;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("metrics")
  metrics() {
    return this.admin.metrics();
  }

  @Get("plans")
  plans() {
    return this.admin.plans();
  }

  @Get("users")
  users(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("q") q?: string,
  ) {
    return this.admin.listUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
    });
  }

  @Get("users/:id")
  user(@Param("id") id: string) {
    return this.admin.getUser(id);
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(id, dto);
  }

  @Post("users/:id/credits")
  credits(@Param("id") id: string, @Body() dto: CreditsDto) {
    return this.admin.adjustCredits(id, dto);
  }

  @Get("jobs")
  jobs(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.admin.listJobs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("leads")
  leads(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.admin.listLeads({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
