import { apiFetch } from "./client";

export type AdminMetrics = {
  totalUsers: number;
  usersByPlan: Record<string, number>;
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  totalSites: number;
  totalLeads: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  planId: string;
  credits: number;
  telegramId?: string | null;
  createdAt: string;
};

export type UsersPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export const getMetrics = () => apiFetch<AdminMetrics>("/admin/metrics");

export const listUsers = (q?: string, page = 1) =>
  apiFetch<UsersPage>(
    `/admin/users?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  );

export const updateUser = (
  id: string,
  patch: { role?: AdminUser["role"]; planId?: string; name?: string },
) => apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: patch });

export const adjustCredits = (id: string, body: { amount?: number; balance?: number }) =>
  apiFetch<{ balance: number; planId: string }>(`/admin/users/${id}/credits`, {
    method: "POST",
    body,
  });
