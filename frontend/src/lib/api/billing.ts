import { apiFetch } from "./client";
import type { BillingCycle, PlanId } from "@/lib/plans";

export type PaymentProvider = "tbank" | "yookassa";

export type CheckoutResult = { paymentId: string; confirmationUrl: string };

export type BillingState = {
  planId: string;
  credits: number;
  subscription: {
    planId: string;
    cycle: string;
    status: string;
    currentPeriodEnd?: string | null;
  } | null;
};

export type Invoice = {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  planId: string;
  cycle: string;
  createdAt: string;
};

/**
 * Инициирует оплату тарифа. Возвращает URL платёжной формы провайдера,
 * на который нужно отправить пользователя (window.location).
 */
export async function startCheckout(
  planId: PlanId,
  cycle: BillingCycle,
  provider: PaymentProvider = "tbank",
): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>("/billing/checkout", {
    method: "POST",
    body: { planId, cycle, provider },
  });
}

export async function getBilling(): Promise<BillingState> {
  return apiFetch<BillingState>("/billing/me");
}

export async function getInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>("/billing/invoices");
}
