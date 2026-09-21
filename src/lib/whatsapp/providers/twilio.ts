import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult } from "@/lib/whatsapp/provider";

/**
 * Twilio WhatsApp provider — scaffolded, not wired live (no credentials exist for this
 * project). Set WHATSAPP_PROVIDER=twilio plus TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
 * TWILIO_WHATSAPP_FROM to activate this instead of the console provider. Uses Twilio's
 * plain REST API (Basic Auth) directly so no extra SDK dependency is required.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly from: string | undefined;

  constructor(config?: { accountSid?: string | null; authToken?: string | null; from?: string | null }) {
    this.accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.from = config?.from || process.env.TWILIO_WHATSAPP_FROM;
  }

  // Twilio's own template requirement (Content API / approved WhatsApp templates) uses a
  // different Content SID mechanism than Meta's — not built out since Meta was the chosen
  // provider; `template` is accepted for interface compatibility but not yet acted on here.
  async send(to: string, body: string): Promise<WhatsAppSendResult> {
    if (!this.accountSid || !this.authToken || !this.from) {
      return { status: "FAILED", failedReason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM not configured" };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${this.from}`,
          To: `whatsapp:${to}`,
          Body: body,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { status: "FAILED", failedReason: `Twilio API ${res.status}: ${errorText}` };
      }

      const data = (await res.json()) as { sid?: string };
      return { status: "SENT", providerMessageId: data.sid };
    } catch (error) {
      return { status: "FAILED", failedReason: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}
