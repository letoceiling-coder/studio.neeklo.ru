import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  WebhookResult,
} from "./provider.types.js";

// Документация: https://developer.tbank.ru/eacq/scenarios/payments
const API = "https://securepay.tinkoff.ru/v2";

type TbankInitResponse = {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  Status?: string;
  PaymentId?: string;
  PaymentURL?: string;
};

@Injectable()
export class TbankProvider implements PaymentProvider {
  readonly name = "tbank" as const;

  private get terminalKey() {
    return process.env.TBANK_TERMINAL_KEY ?? "";
  }
  private get password() {
    return process.env.TBANK_PASSWORD ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.terminalKey && this.password);
  }

  /**
   * Token = SHA256 от конкатенации значений корневых параметров (примитивов),
   * включая Password, отсортированных по имени ключа. Объекты и Token исключаются.
   */
  private makeToken(params: Record<string, unknown>): string {
    const flat: Record<string, string> = { Password: this.password };
    for (const [k, v] of Object.entries(params)) {
      if (k === "Token") continue;
      if (v === undefined || v === null) continue;
      if (typeof v === "object") continue;
      flat[k] = typeof v === "boolean" ? String(v) : String(v);
    }
    const concat = Object.keys(flat)
      .sort()
      .map((k) => flat[k])
      .join("");
    return createHash("sha256").update(concat).digest("hex");
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const base: Record<string, unknown> = {
      TerminalKey: this.terminalKey,
      Amount: Math.round(input.amountRub * 100),
      OrderId: input.orderId,
      Description: input.description.slice(0, 250),
      SuccessURL: input.returnUrl,
      FailURL: input.returnUrl,
    };
    const Token = this.makeToken(base);

    const res = await fetch(`${API}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...base, Token }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`T-Bank Init failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as TbankInitResponse;
    if (!data.Success || !data.PaymentURL || !data.PaymentId) {
      throw new Error(`T-Bank Init rejected: ${data.ErrorCode} ${data.Message ?? ""}`);
    }
    return { externalId: data.PaymentId, confirmationUrl: data.PaymentURL };
  }

  async parseWebhook(body: unknown): Promise<WebhookResult> {
    const data = body as Record<string, unknown>;
    const received = String(data.Token ?? "");
    const expected = this.makeToken(data);
    if (!received || received !== expected) {
      throw new Error("T-Bank webhook: invalid token");
    }
    const status = String(data.Status ?? "");
    const ok = status === "CONFIRMED" || status === "AUTHORIZED";
    const rejected = status === "REJECTED" || status === "CANCELED" || data.Success === false;
    return {
      orderId: String(data.OrderId ?? ""),
      externalId: String(data.PaymentId ?? ""),
      status: ok ? "succeeded" : rejected ? "failed" : "pending",
      amountRub: data.Amount ? Math.round(Number(data.Amount) / 100) : undefined,
    };
  }
}
