/**
 * Client for cursor.neeklo.ru — NEEKLO Platform IDE / site builder.
 * @see docs/CURSOR-PLATFORM-API.md
 */

export type PlatformApiConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export type AgentMode = "agent" | "plan" | "ask";

export type AgentRunRequest = {
  prompt: string;
  model: string;
  mode?: AgentMode;
  continue_session?: string;
  history?: boolean;
};

export type AgentRunResponse = {
  object: "agent.run";
  project: string;
  run_id: number;
  status: "completed" | "failed" | "running";
  mode: AgentMode;
  model: string;
  summary: string;
  files_changed: Array<{ path: string; action: string; bytes?: number }>;
  published?: { url: string; file_count: number };
  ide_session_id?: string;
  tokens?: number;
  error?: string;
};

export type CreateProjectRequest = {
  workspace: string;
};

export type CreateProjectResponse = {
  object: "project";
  id: string;
  workspace: string;
  workspace_folder: string;
  ide_url: string;
  workspace_storage_id: string;
};

export class NeekloPlatformApi {
  constructor(private readonly config: PlatformApiConfig) {}

  private get fetchFn() {
    return this.config.fetch ?? fetch;
  }

  private headers(projectSlug?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };
    if (projectSlug) h["X-Neeklo-Project"] = projectSlug;
    return h;
  }

  async getMe() {
    const res = await this.fetchFn(`${this.config.baseUrl}/me`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET /me failed: ${res.status}`);
    return res.json();
  }

  async listProjects() {
    const res = await this.fetchFn(`${this.config.baseUrl}/projects`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET /projects failed: ${res.status}`);
    return res.json();
  }

  async createProject(body: CreateProjectRequest) {
    const res = await this.fetchFn(`${this.config.baseUrl}/projects`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /projects failed: ${res.status}`);
    return res.json() as Promise<CreateProjectResponse>;
  }

  async runAgent(projectSlug: string, body: AgentRunRequest) {
    const res = await this.fetchFn(
      `${this.config.baseUrl}/projects/${projectSlug}/agent`,
      {
        method: "POST",
        headers: this.headers(projectSlug),
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`POST /projects/${projectSlug}/agent failed: ${res.status} ${err}`);
    }
    return res.json() as Promise<AgentRunResponse>;
  }

  async getRun(projectSlug: string, runId: number) {
    const res = await this.fetchFn(
      `${this.config.baseUrl}/projects/${projectSlug}/runs/${runId}`,
      { headers: this.headers(projectSlug) },
    );
    if (!res.ok) throw new Error(`GET run failed: ${res.status}`);
    return res.json() as Promise<AgentRunResponse>;
  }

  async publish(projectSlug: string) {
    const res = await this.fetchFn(
      `${this.config.baseUrl}/projects/${projectSlug}/publish`,
      { method: "POST", headers: this.headers(projectSlug) },
    );
    if (!res.ok) throw new Error(`POST publish failed: ${res.status}`);
    return res.json() as Promise<{
      object: "publish";
      url: string;
      file_count: number;
    }>;
  }

  async getFile(projectSlug: string, path: string) {
    const url = new URL(`${this.config.baseUrl}/projects/${projectSlug}/file`);
    url.searchParams.set("path", path);
    const res = await this.fetchFn(url, { headers: this.headers(projectSlug) });
    if (!res.ok) throw new Error(`GET file failed: ${res.status}`);
    return res.json() as Promise<{ path: string; content: string }>;
  }

  async listFiles(projectSlug: string) {
    const res = await this.fetchFn(
      `${this.config.baseUrl}/projects/${projectSlug}/files`,
      { headers: this.headers(projectSlug) },
    );
    if (!res.ok) throw new Error(`GET files failed: ${res.status}`);
    return res.json();
  }

  async getModels() {
    const res = await this.fetchFn(`${this.config.baseUrl}/models`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`GET /models failed: ${res.status}`);
    return res.json();
  }
}
