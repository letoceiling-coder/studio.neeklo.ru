import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  WebhookResult,
} from "./provider.types.js";

const API = "https://api.yookassa.ru/v3";

type YooPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount?: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
  metadata?: { orderId?: string };
};

@Injectable()
export class YookassaProvider implements PaymentProvider {
  readonly name = "yookassa" as const;

  private get shopId() {
    return process.env.YUKASSA_SHOP_ID ?? "";
  }
  private get secret() {
    return process.env.YUKASSA_SECRET_KEY ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.shopId && this.secret);
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.shopId}:${this.secret}`).toString("base64");
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Idempotence-Key": randomUUID(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { value: input.amountRub.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: input.returnUrl },
        description: input.description,
        metadata: { orderId: input.orderId },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YooKassa create failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as YooPayment;
    const url = data.confirmation?.confirmation_url;
    if (!url) throw new Error("YooKassa: no confirmation_url");
    return { externalId: data.id, confirmationUrl: url };
  }

  /**
   * YooKassa не подписывает вебхуки секретом — рекомендуется перепроверять статус
   * платежа запросом к API по id из уведомления.
   */
  async parseWebhook(body: unknown): Promise<WebhookResult> {
    const event = body as { object?: YooPayment };
    const obj = event.object;
    if (!obj?.id) throw new Error("YooKassa webhook: no payment id");

    const verifyRes = await fetch(`${API}/payments/${obj.id}`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!verifyRes.ok) throw new Error(`YooKassa verify failed: ${verifyRes.status}`);
    const payment = (await verifyRes.json()) as YooPayment;

    const status =
      payment.status === "succeeded"
        ? "succeeded"
        : payment.status === "canceled"
          ? "failed"
          : "pending";
    return {
      orderId: payment.metadata?.orderId ?? "",
      externalId: payment.id,
      status,
      amountRub: payment.amount ? Math.round(Number(payment.amount.value)) : undefined,
    };
  }
}
