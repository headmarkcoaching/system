import "server-only";
import type { EmailProvider, EmailSendResult } from "@/lib/email/provider";

/**
 * Default provider — no real SMTP credentials exist for this project. Logs the message
 * (visible in server logs and recorded in EmailMessage for the Communication Center UI) and
 * marks it SENT immediately. Swap EMAIL_PROVIDER to "smtp" once real credentials are
 * available; nothing else needs to change.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(to: string, subject: string, body: string): Promise<EmailSendResult> {
    console.log(`[Email:console] -> ${to}\nSubject: ${subject}\n${body}`);
    return { status: "SENT", providerMessageId: `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}
