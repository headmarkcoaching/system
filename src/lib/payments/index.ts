import "server-only";
import type { PaymentProvider } from "@/lib/payments/provider";
import { ConsolePaymentProvider } from "@/lib/payments/providers/console-provider";

let cached: PaymentProvider | null = null;

/** PAYMENT_PROVIDER selects the active provider — "console" (default) today; a future
 * bank/Raast/wallet/gateway integration plugs in behind the same interface. */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const provider = process.env.PAYMENT_PROVIDER || "console";
  switch (provider) {
    case "console":
      cached = new ConsolePaymentProvider();
      return cached;
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER "${provider}"`);
  }
}
