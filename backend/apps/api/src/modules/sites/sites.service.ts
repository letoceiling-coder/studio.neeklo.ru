import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NeekloPlatformApi } from "@studio/neeklo-sdk";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SitesService {
  private readonly platform: NeekloPlatformApi;

  constructor(private readonly prisma: PrismaService) {
    this.platform = new NeekloPlatformApi({
      baseUrl:
        process.env.NEEKLO_PLATFORM_API_URL ??
        "https://cursor.neeklo.ru/api/v1",
      apiKey: process.env.NEEKLO_PLATFORM_API_KEY ?? "",
    });
  }

  list(userId: string) {
    return this.prisma.site.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(userId: string, input: { title: string; slug: string }) {
    const slug = input.slug.trim().toLowerCase();
    const existing = await this.prisma.site.findFirst({
      where: { userId, slug },
    });
    if (existing) throw new ConflictException("Site slug already exists");

    const platformProject = await this.platform.createProject({
      workspace: slug,
    });

    return this.prisma.site.create({
      data: {
        userId,
        title: input.title.trim(),
        slug,
        platformProjectSlug: platformProject.id,
      },
    });
  }

  async get(userId: string, id: string) {
    const site = await this.prisma.site.findFirst({ where: { id, userId } });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  async runAgent(
    userId: string,
    id: string,
    input: { prompt: string; model: string; mode?: "agent" | "plan" | "ask" },
  ) {
    const site = await this.get(userId, id);
    const projectSlug = site.platformProjectSlug ?? site.slug;

    const result = await this.platform.runAgent(projectSlug, {
      prompt: input.prompt,
      model: input.model,
      mode: input.mode ?? "agent",
    });

    await this.prisma.siteVersion.create({
      data: {
        siteId: site.id,
        label: result.summary.slice(0, 120) || "Agent run",
        state: { summary: result.summary, files: result.files_changed },
        runId: result.run_id,
      },
    });

    if (result.published?.url) {
      await this.prisma.site.update({
        where: { id: site.id },
        data: { publishedUrl: result.published.url },
      });
    }

    return result;
  }

  async publish(userId: string, id: string) {
    const site = await this.get(userId, id);
    const projectSlug = site.platformProjectSlug ?? site.slug;
    const result = await this.platform.publish(projectSlug);
    await this.prisma.site.update({
      where: { id: site.id },
      data: { publishedUrl: result.url },
    });
    return result;
  }
}
