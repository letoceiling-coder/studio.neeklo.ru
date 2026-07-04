// Опциональный исходящий прокси для провайдеров, заблокированных в РФ
// (ElevenLabs/OpenAI/Anthropic/Gemini). Включается переменной EGRESS_PROXY_URL,
// например http://127.0.0.1:8888 — локальный конец SSH-туннеля на не-РФ прокси.
//
// Возвращает undici ProxyAgent для передачи в fetch как `dispatcher`.
// Если EGRESS_PROXY_URL не задан — возвращает undefined (прямой трафик).
import { ProxyAgent } from "undici";

let cached: ProxyAgent | null | undefined;

export function egressDispatcher(): ProxyAgent | undefined {
  if (cached !== undefined) return cached ?? undefined;
  const url = process.env.EGRESS_PROXY_URL?.trim();
  cached = url ? new ProxyAgent(url) : null;
  return cached ?? undefined;
}
