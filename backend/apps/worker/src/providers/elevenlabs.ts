// ElevenLabs text-to-speech. Возвращает аудио (mp3) в виде Buffer.
// Документация: https://elevenlabs.io/docs/api-reference
import { egressDispatcher } from "./egress.js";

function apiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY_ALT ?? "";
}

export async function elevenTts(input: Record<string, unknown>): Promise<Buffer> {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");

  const voiceId =
    (input.voiceId as string | undefined) ??
    process.env.ELEVENLABS_VOICE_ID ??
    "21m00Tcm4TlvDq8ikWAM";
  const text = String(input.text ?? input.prompt ?? "");
  if (!text) throw new Error("voice: empty text");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "User-Agent": "neeklo-studio/1.0 (+https://studio.neeklo.ru)",
      },
      body: JSON.stringify({
        text,
        model_id: (input.model as string | undefined) ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      // через не-РФ прокси, если задан EGRESS_PROXY_URL
      dispatcher: egressDispatcher(),
    } as RequestInit & { dispatcher?: unknown },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
