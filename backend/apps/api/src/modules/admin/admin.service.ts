import { Injectable } from "@nestjs/common";
import type { PlanId, UserRole } from "@prisma/client";
import { PLANS } from "@studio/shared";
import { CreditsService } from "../credits/credits.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async listUsers(opts: { page?: number; pageSize?: number; q?: string }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    const where = opts.q
      ? {
          OR: [
            { email: { contains: opts.q, mode: "insensitive" as const } },
            { name: { contains: opts.q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planId: true,
          credits: true,
          telegramId: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planId: true,
        credits: true,
        telegramId: true,
        onboarding: true,
        createdAt: true,
      },
    });
  }

  updateUser(id: string, patch: { role?: UserRole; planId?: PlanId; name?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(patch.role ? { role: patch.role } : {}),
        ...(patch.planId ? { planId: patch.planId } : {}),
        ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
      },
      select: { id: true, email: true, name: true, role: true, planId: true, credits: true },
    });
  }

  adjustCredits(id: string, body: { amount?: number; balance?: number }) {
    if (typeof body.balance === "number") return this.credits.setBalance(id, body.balance);
    return this.credits.grant(id, body.amount ?? 0);
  }

  listJobs(opts: { page?: number; pageSize?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    return Promise.all([
      this.prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.job.count(),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  async listLeads(opts: { page?: number; pageSize?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async metrics() {
    const [totalUsers, usersByPlan, totalJobs, jobsByStatus, totalSites, totalLeads] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.groupBy({ by: ["planId"], _count: true }),
        this.prisma.job.count(),
        this.prisma.job.groupBy({ by: ["status"], _count: true }),
        this.prisma.site.count(),
        this.prisma.lead.count(),
      ]);
    return {
      totalUsers,
      usersByPlan: Object.fromEntries(usersByPlan.map((r) => [r.planId, r._count])),
      totalJobs,
      jobsByStatus: Object.fromEntries(jobsByStatus.map((r) => [r.status, r._count])),
      totalSites,
      totalLeads,
    };
  }

  plans() {
    return Object.values(PLANS);
  }
}
