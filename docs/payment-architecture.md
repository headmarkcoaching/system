# Payment Architecture

## What's live today (Phase 2, unchanged)

Payments are **manually recorded**, not gateway-processed: staff record an amount/method (Bank Transfer/Raast/Easypaisa/JazzCash/Cash)/reference number against a specific `Installment` from Student 360 → Payments. `Payment.installmentId` scopes "how much has been paid toward this installment" correctly (a real bug — a payment scoped to the whole plan instead of one installment — was found and fixed in Phase 2). This flow is unchanged by Phase 3E's abstraction below.

## Provider abstraction (Phase 3E — architecture readiness)

`src/lib/payments/provider.ts` defines a `PaymentProvider` interface, mirroring the AI/WhatsApp abstraction pattern exactly:

```ts
interface PaymentProvider {
  initiate(request): Promise<PaymentInitiationResult>;
  verify(providerReference): Promise<PaymentVerificationResult>;
  handleWebhook(payload): Promise<PaymentWebhookResult>;
  refund(providerReference, amount?): Promise<RefundResult>;
}
```

Select the active provider with `PAYMENT_PROVIDER` (`console` default). `ConsolePaymentProvider` logs the request and returns a fake-but-consistent reference — it demonstrates the whole interface shape without a real gateway account, but **deliberately does not touch any `Payment`/`Installment` row**. The existing manual-recording flow is the only thing that changes payment records today.

`/admin/settings/payment-gateway` shows the active provider and a "Test Connection" button that calls `.initiate()` and displays the result — a way to see the plumbing work without pretending payments actually flow through it.

## Why this shape

The spec's own instruction was "do not hard-code one payment provider; support future bank integrations, Raast-compatible workflows, wallets, online payment gateways; handle initiation, verification, webhook, failure, refund (future-ready)." A real integration (say, a Pakistani payment gateway) would implement this same interface as a new file under `src/lib/payments/providers/`, wire `initiate()`'s redirect/success into a new webhook route that calls the existing `paymentsService.recordPayment()`, and nothing else in the app would need to change.

## Known limitation

No real gateway integration exists — this is architecture readiness only, same honesty precedent as the AI/WhatsApp console providers before real credentials existed for those.
