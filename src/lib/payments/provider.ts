export interface PaymentInitiationRequest {
  amount: number;
  currency: string;
  studentId: string;
  installmentId?: string;
  returnUrl?: string;
}

export interface PaymentInitiationResult {
  status: "SUCCESS" | "FAILED";
  redirectUrl?: string;
  providerReference?: string;
  errorMessage?: string;
}

export interface PaymentVerificationResult {
  status: "PAID" | "PENDING" | "FAILED";
  providerReference: string;
  amount?: number;
}

export interface PaymentWebhookResult {
  providerReference: string;
  status: "PAID" | "FAILED";
  amount: number;
}

export interface RefundResult {
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}

/** Mirrors AIProvider/WhatsAppProvider exactly — a provider swap is a one-file change plus an
 * env var, never a rewrite of calling code. Note this interface exists as architecture
 * readiness (per the spec's "do not hard-code one payment provider, prepare for future bank
 * integrations/Raast/wallets/gateways" wording) — it is NOT wired into the existing manual
 * payment-recording UI (Student 360 → Payments), since there is no real gateway account to
 * actually initiate/verify/webhook against yet. The manual recording flow built in Phase 2
 * stays exactly as it is. */
export interface PaymentProvider {
  initiate(request: PaymentInitiationRequest): Promise<PaymentInitiationResult>;
  verify(providerReference: string): Promise<PaymentVerificationResult>;
  handleWebhook(payload: unknown): Promise<PaymentWebhookResult>;
  refund(providerReference: string, amount?: number): Promise<RefundResult>;
}
