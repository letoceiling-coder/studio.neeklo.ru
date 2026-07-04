import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const API = "https://openrouter.ai/api/v1/chat/completions";

@Injectable()
export class OpenRouterService {
  private get apiKey() {
    return process.env.OPENROUTER_API_KEY ?? "";
  }
  private get model() {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://studio.neeklo.ru",
      "X-Title": "neeklo studio",
    };
  }

  /** Потоковый чат: вызывает onDelta для каждого фрагмента, возвращает полный текст. */
  async streamChat(
    messages: ChatMessage[],
    onDelta: (delta: string) => void,
    opts?: { model?: string; temperature?: number },
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException("OpenRouter is not configured");
    }
    const res = await fetch(API, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts?.model ?? this.model,
        messages,
        temperature: opts?.temperature ?? 0.7,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`OpenRouter error: ${res.status} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          /* пропускаем неполные/служебные строки */
        }
      }
    }
    return full;
  }

  /** Непотоковый ответ (для коротких задач: копирайт, заголовки). */
  async complete(messages: ChatMessage[], opts?: { model?: string; temperature?: number }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException("OpenRouter is not configured");
    }
    const res = await fetch(API, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts?.model ?? this.model,
        messages,
        temperature: opts?.temperature ?? 0.7,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ServiceUnavailableException(`OpenRouter error: ${res.status} ${text}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? "";
  }
}
