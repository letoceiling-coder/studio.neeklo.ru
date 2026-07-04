/**
 * Client for api.neeklo.ru — AI image/video generation.
 * @see API (6).md
 */

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type GenerationApiConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export type ImageGenerateRequest = {
  prompt: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  referenceImage?: string;
  referenceExt?: string;
};

export type VideoGenerateRequest = {
  prompt: string;
  referenceImage: string;
  referenceExt?: string;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  duration?: number;
};

export class NeekloGenerationApi {
  constructor(private readonly config: GenerationApiConfig) {}

  private get fetchFn() {
    return this.config.fetch ?? fetch;
  }

  private headers(): Record<string, string> {
    return {
      "x-api-key": this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getModels() {
    const res = await this.fetchFn(`${this.config.baseUrl}/v1/models`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET /v1/models failed: ${res.status}`);
    return res.json();
  }

  async generateImage(body: ImageGenerateRequest) {
    const res = await this.fetchFn(`${this.config.baseUrl}/v1/generate/image`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /v1/generate/image failed: ${res.status}`);
    return res.json() as Promise<{ jobId: string; status: string }>;
  }

  async generateVideo(body: VideoGenerateRequest) {
    const res = await this.fetchFn(`${this.config.baseUrl}/v1/generate/video`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /v1/generate/video failed: ${res.status}`);
    return res.json() as Promise<{ jobId: string; status: string }>;
  }

  async getJob(jobId: string) {
    const res = await this.fetchFn(`${this.config.baseUrl}/v1/jobs/${jobId}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET /v1/jobs/${jobId} failed: ${res.status}`);
    return res.json() as Promise<{
      jobId: string;
      kind: string;
      status: GenerationJobStatus;
      error: string | null;
      createdAt: number;
      finishedAt?: number;
    }>;
  }

  async downloadJob(jobId: string): Promise<ArrayBuffer> {
    const res = await this.fetchFn(
      `${this.config.baseUrl}/v1/jobs/${jobId}/download`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`GET /v1/jobs/${jobId}/download failed: ${res.status}`);
    return res.arrayBuffer();
  }
}
