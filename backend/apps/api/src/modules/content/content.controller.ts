import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { IsObject, IsOptional, IsString } from "class-validator";
import { SuperAdminGuard } from "../../common/roles.guard.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ContentService } from "./content.service.js";

class SaveHomeDto {
  @IsObject()
  value!: Record<string, unknown>;
}

class UploadDto {
  @IsString()
  dataUrl!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // Публичный: лендинг читает контент главной при SSR.
  @Get("home")
  async getHome() {
    return { value: await this.content.get("home") };
  }

  // Только суперадмин: сохранить контент главной.
  @Put("home")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async saveHome(@Body() dto: SaveHomeDto) {
    return { value: await this.content.set("home", dto.value) };
  }

  // Только суперадмин: загрузка изображения (data:URL -> /uploads).
  @Post("upload")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async upload(@Body() dto: UploadDto) {
    try {
      return await this.content.saveImage(dto.dataUrl, dto.name);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "Не удалось загрузить файл",
      );
    }
  }
}
