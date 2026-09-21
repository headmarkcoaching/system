import "server-only";
import { randomUUID } from "crypto";
import type { PaymentProvider, PaymentInitiationRequest, PaymentInitiationResult, PaymentVerificationResult, PaymentWebhookResult, RefundResult } from "@/lib/payments/provider";

// Zero-config default — logs the request and returns a fake-but-consistent reference so the
// whole interface is demonstrable (see /admin/settings/payment-gateway's "Test Connection")
// without a real gateway account. Never actually changes a Payment/Installment record — the
// existing manual-recording flow (Student 360 → Payments) is the only thing that does that.
export class ConsolePaymentProvider implements PaymentProvider {
  async initiate(request: PaymentInitiationRequest): Promise<PaymentInitiationResult> {
    const reference = `console_${randomUUID()}`;
    console.log(`[ConsolePaymentProvider] initiate: Rs ${request.amount} ${request.currency} for student ${request.studentId} -> ${reference}`);
    return { status: "SUCCESS", providerReference: reference, redirectUrl: request.returnUrl };
  }

  async verify(providerReference: string): Promise<PaymentVerificationResult> {
    console.log(`[ConsolePaymentProvider] verify: ${providerReference}`);
    return { status: "PENDING", providerReference };
  }

  async handleWebhook(payload: unknown): Promise<PaymentWebhookResult> {
    console.log("[ConsolePaymentProvider] webhook received", payload);
    throw new Error("No real payment gateway is configured — webhooks are not applicable to the console provider.");
  }

  async refund(providerReference: string): Promise<RefundResult> {
    console.log(`[ConsolePaymentProvider] refund requested: ${providerReference}`);
    return { status: "FAILED", errorMessage: "No real payment gateway is configured." };
  }
}
