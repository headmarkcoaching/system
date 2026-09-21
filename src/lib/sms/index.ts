import "server-only";
import type { SmsProvider } from "@/lib/sms/provider";
import { ConsoleSmsProvider } from "@/lib/sms/providers/console-provider";

/** No real provider exists yet — always console, unlike getWhatsAppProvider/getEmailProvider
 * which check Settings → Integrations. Kept as its own function (not a hardcoded `new
 * ConsoleSmsProvider()` at each call site) so wiring a real provider later is a one-file change
 * here, exactly like the WhatsApp/Email precedent. */
export async function getSmsProvider(): Promise<SmsProvider> {
  return new ConsoleSmsProvider();
}

export type { SmsProvider, SmsSendResult } from "@/lib/sms/provider";
