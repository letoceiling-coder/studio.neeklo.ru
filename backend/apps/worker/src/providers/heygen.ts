// HeyGen avatar video. Возвращает hosted URL результата.
// Документация: https://docs.heygen.com/reference

function apiKey(): string {
  return process.env.HEYGEN_API_KEY ?? "";
}

type HeyGenGenerate = { data?: { video_id?: string }; error?: unknown };
type HeyGenStatus = {
  data?: { status?: string; video_url?: string; error?: unknown };
};

export async function heygenAvatar(
  input: Record<string, unknown>,
  onProgress?: (p: number) => void,
): Promise<{ url: string; raw: unknown }> {
  const key = apiKey();
  if (!key) throw new Error("HEYGEN_API_KEY is not configured");

  const avatarId = input.avatarId as string | undefined;
  const voiceId = input.voiceId as string | undefined;
  const text = String(input.text ?? input.prompt ?? "");
  if (!avatarId || !voiceId) {
    throw new Error("avatar: input.avatarId и input.voiceId обязательны");
  }

  const genRes = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: { "X-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: { type: "text", input_text: text, voice_id: voiceId },
        },
      ],
      dimension: { width: 1280, height: 720 },
    }),
  });
  if (!genRes.ok) {
    throw new Error(`HeyGen generate failed: ${genRes.status} ${await genRes.text()}`);
  }
  const gen = (await genRes.json()) as HeyGenGenerate;
  const videoId = gen.data?.video_id;
  if (!videoId) throw new Error(`HeyGen: no video_id (${JSON.stringify(gen)})`);

  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": key } },
    );
    if (!st.ok) continue;
    const status = (await st.json()) as HeyGenStatus;
    if (onProgress) onProgress(Math.min(0.9, 0.3 + (i / maxAttempts) * 0.6));
    const s = status.data?.status;
    if (s === "completed" && status.data?.video_url) {
      return { url: status.data.video_url, raw: status };
    }
    if (s === "failed") {
      throw new Error(`HeyGen failed: ${JSON.stringify(status.data?.error)}`);
    }
    if (i === maxAttempts - 1) throw new Error("HeyGen timeout");
  }
  throw new Error("HeyGen timeout");
}
