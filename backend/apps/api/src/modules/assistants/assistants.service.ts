import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreditsService } from "../credits/credits.service.js";
import { RealtimePublisher } from "../queue/realtime.publisher.js";
import { OpenRouterService, type ChatMessage } from "../llm/openrouter.service.js";

const CHAT_COST = 2;
const KB_LIMIT = 8000;

@Injectable()
export class AssistantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly realtime: RealtimePublisher,
    private readonly llm: OpenRouterService,
  ) {}

  list(userId: string) {
    return this.prisma.assistant.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.assistant.findFirst({
      where: { id, userId },
      include: { documents: true },
    });
    if (!a) throw new NotFoundException("Assistant not found");
    return a;
  }

  create(userId: string, input: { name: string; config?: unknown }) {
    return this.prisma.assistant.create({
      data: { userId, name: input.name, config: (input.config ?? {}) as never },
    });
  }

  async update(userId: string, id: string, patch: { name?: string; config?: unknown }) {
    await this.get(userId, id);
    return this.prisma.assistant.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.config !== undefined ? { config: patch.config as never } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.assistant.delete({ where: { id } });
    return { ok: true };
  }

  private buildSystemPrompt(
    name: string,
    config: Record<string, unknown> | null,
    docs: { title: string; content: string }[],
  ): string {
    const parts: string[] = [];
    const custom = config && typeof config.systemPrompt === "string" ? config.systemPrompt : "";
    parts.push(custom || `Ты — AI-ассистент «${name}». Отвечай дружелюбно и по делу на русском языке.`);
    if (docs.length) {
      let kb = "\n\nБаза знаний (используй для ответов):\n";
      for (const d of docs) {
        kb += `\n## ${d.title}\n${d.content}\n`;
        if (kb.length > KB_LIMIT) break;
      }
      parts.push(kb.slice(0, KB_LIMIT));
    }
    return parts.join("\n");
  }

  /**
   * Стримит ответ ассистента в WS-комнату пользователя (assistant.message.delta),
   * затем assistant.message.done. Возвращает полный текст.
   */
  async chat(userId: string, id: string, messages: ChatMessage[]) {
    const assistant = await this.get(userId, id);
    await this.credits.consume(userId, CHAT_COST);

    const config = (assistant.config ?? null) as Record<string, unknown> | null;
    const system = this.buildSystemPrompt(assistant.name, config, assistant.documents);
    const model = config && typeof config.model === "string" ? config.model : undefined;

    const chatMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...messages.filter((m) => m.role !== "system").slice(-20),
    ];

    const messageId = randomUUID();
    const text = await this.llm.streamChat(
      chatMessages,
      (delta) => {
        void this.realtime.publish(userId, {
          type: "assistant.message.delta",
          assistantId: id,
          messageId,
          delta,
        });
      },
      { model },
    );

    void this.realtime.publish(userId, {
      type: "assistant.message.done",
      assistantId: id,
      messageId,
      text,
    });

    return { messageId, text };
  }
}
