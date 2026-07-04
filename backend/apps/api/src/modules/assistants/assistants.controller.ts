import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser, type AuthUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AssistantsService } from "./assistants.service.js";

class CreateAssistantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

class UpdateAssistantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

class ChatMessageDto {
  @IsIn(["system", "user", "assistant"])
  role!: "system" | "user" | "assistant";

  @IsString()
  content!: string;
}

class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}

@Controller("assistants")
@UseGuards(JwtAuthGuard)
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.assistants.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssistantDto) {
    return this.assistants.create(user.userId, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.assistants.get(user.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateAssistantDto,
  ) {
    return this.assistants.update(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.assistants.remove(user.userId, id);
  }

  @Post(":id/chat")
  chat(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ChatDto) {
    return this.assistants.chat(user.userId, id, dto.messages);
  }
}
