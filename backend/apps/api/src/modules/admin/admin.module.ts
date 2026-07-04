import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CreditsModule } from "../credits/credits.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
