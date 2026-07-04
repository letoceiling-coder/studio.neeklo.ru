// fal.ai провайдер: image (sync) + video (queue API).
// Документация: https://fal.ai/docs

const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell";
const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL ?? "fal-ai/ltx-video";

function falKey(): string {
  return process.env.FAL_KEY ?? "";
}

function headers() {
  return {
    Authorization: `Key ${falKey()}`,
    "Content-Type": "application/json",
  };
}

function ensureConfigured() {
  if (!falKey()) throw new Error("FAL_KEY is not configured");
}

type FalImageResult = {
  images?: { url: string; width?: number; height?: number }[];
};

export async function falImage(input: Record<string, unknown>): Promise<{
  url: string;
  raw: unknown;
}> {
  ensureConfigured();
  const body: Record<string, unknown> = {
    prompt: String(input.prompt ?? ""),
    num_images: 1,
  };
  if (input.image_size) body.image_size = input.image_size;
  if (input.seed !== undefined) body.seed = input.seed;

  const res = await fetch(`https://fal.run/${IMAGE_MODEL}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`fal image failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as FalImageResult;
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("fal image: no image url in response");
  return { url, raw: data };
}

type FalQueueSubmit = {
  request_id: string;
  status_url?: string;
  response_url?: string;
};

type FalQueueStatus = { status: string };

export async function falVideo(
  input: Record<string, unknown>,
  onProgress?: (p: number) => void,
): Promise<{ url: string; raw: unknown }> {
  ensureConfigured();
  const submitRes = await fetch(`https://queue.fal.run/${VIDEO_MODEL}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ prompt: String(input.prompt ?? "") }),
  });
  if (!submitRes.ok) {
    throw new Error(`fal video submit failed: ${submitRes.status} ${await submitRes.text()}`);
  }
  const submit = (await submitRes.json()) as FalQueueSubmit;
  const statusUrl =
    submit.status_url ??
    `https://queue.fal.run/${VIDEO_MODEL}/requests/${submit.request_id}/status`;
  const responseUrl =
    submit.response_url ??
    `https://queue.fal.run/${VIDEO_MODEL}/requests/${submit.request_id}`;

  const maxAttempts = 120; // до ~10 минут при шаге 5с
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(statusUrl, { headers: headers() });
    if (!st.ok) continue;
    const status = (await st.json()) as FalQueueStatus;
    if (onProgress) onProgress(Math.min(0.9, 0.3 + (i / maxAttempts) * 0.6));
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error(`fal video failed: ${JSON.stringify(status)}`);
    }
    if (i === maxAttempts - 1) throw new Error("fal video timeout");
  }

  const resp = await fetch(responseUrl, { headers: headers() });
  if (!resp.ok) throw new Error(`fal video result failed: ${resp.status}`);
  const data = (await resp.json()) as Record<string, unknown>;
  const video = data.video as { url?: string } | undefined;
  const url = video?.url ?? (data.video_url as string | undefined);
  if (!url) throw new Error("fal video: no video url in response");
  return { url, raw: data };
}
