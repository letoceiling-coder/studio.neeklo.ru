export type CreatePaymentInput = {
  /** Внутренний идентификатор платежа (наш Payment.id), используется как orderId. */
  orderId: string;
  /** Сумма в рублях (целое). */
  amountRub: number;
  description: string;
  returnUrl: string;
  email?: string;
};

export type CreatePaymentResult = {
  /** Идентификатор платежа на стороне провайдера. */
  externalId: string;
  /** URL для редиректа пользователя на оплату. */
  confirmationUrl: string;
};

/** Нормализованный результат разбора вебхука. */
export type WebhookResult = {
  /** orderId (наш Payment.id). */
  orderId: string;
  externalId: string;
  status: "succeeded" | "failed" | "pending";
  amountRub?: number;
};

export interface PaymentProvider {
  readonly name: "yookassa" | "tbank";
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Проверить подпись и разобрать вебхук. Бросает при невалидной подписи. */
  parseWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookResult>;
}
