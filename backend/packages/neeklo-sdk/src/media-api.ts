/**
 * Client for media.neeklo.ru — local media processing (no cloud AI).
 */

export type MediaApiConfig = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export class NeekloMediaApi {
  constructor(private readonly config: MediaApiConfig) {}

  private get fetchFn() {
    return this.config.fetch ?? fetch;
  }

  async getJob(jobId: string) {
    const res = await this.fetchFn(`${this.config.baseUrl}/jobs/${jobId}`);
    if (!res.ok) throw new Error(`GET media job failed: ${res.status}`);
    return res.json();
  }

  async convertImage(body: {
    inputPath: string;
    fileName: string;
    options: Record<string, unknown>;
  }) {
    const res = await this.fetchFn(`${this.config.baseUrl}/images/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST images/convert failed: ${res.status}`);
    return res.json();
  }
}
