import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult } from "@/lib/whatsapp/provider";

/**
 * Default provider — no real WhatsApp Business API credentials exist for this project.
 * Logs the message (visible in server logs and recorded in WhatsAppMessage for the
 * Communication Center UI) and marks it SENT immediately. Swap WHATSAPP_PROVIDER to
 * "meta" or "twilio" once real credentials are available; nothing else needs to change.
 */
export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async send(to: string, body: string, template?: { templateName: string }): Promise<WhatsAppSendResult> {
    console.log(`[WhatsApp:console] -> ${to}${template ? ` (template: ${template.templateName})` : ""}\n${body}`);
    return { status: "SENT", providerMessageId: `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}
