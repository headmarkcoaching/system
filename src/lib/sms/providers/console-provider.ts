import "server-only";
import type { SmsProvider, SmsSendResult } from "@/lib/sms/provider";

/**
 * Only provider that exists for SMS today — no real SMS credentials exist anywhere in this
 * project (unlike WhatsApp/Email, which both have a real provider option). Logs the message and
 * marks it SENT immediately, same "safe, visible, non-blocking default" as every other channel's
 * console provider. A real provider (e.g. Twilio) would slot in here the same way SmtpEmailProvider
 * did for email — nothing else in the send path would need to change.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<SmsSendResult> {
    console.log(`[SMS:console] -> ${to}\n${body}`);
    return { status: "SENT", providerMessageId: `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}
