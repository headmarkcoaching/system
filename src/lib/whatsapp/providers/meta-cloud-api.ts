import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult, WhatsAppTemplateMeta } from "@/lib/whatsapp/provider";

/**
 * Meta WhatsApp Cloud API provider. Set WHATSAPP_PROVIDER=meta plus META_WHATSAPP_TOKEN and
 * META_WHATSAPP_PHONE_ID (from Meta for Developers → WhatsApp → API Setup) to activate this
 * instead of the console provider.
 *
 * Meta only allows freeform `text` messages within 24h of the customer's last message to you.
 * Any business-initiated send outside that window (every automated reminder in this app) must
 * use a pre-approved template — pass `template` (built from MessageTemplate.metaTemplateName)
 * once one is registered in Meta Business Manager; until then this falls back to plain text,
 * which Meta will reject outside the session window (recorded as FAILED with Meta's real
 * error, visible in the Communication Center — not a crash).
 */
export class MetaCloudApiProvider implements WhatsAppProvider {
  private readonly token: string | undefined;
  private readonly phoneId: string | undefined;

  /** `config` (from IntegrationSettings, entered via Settings → Integrations) takes priority;
   * falls back to env vars when a field isn't set there, so an env-only deployment still works. */
  constructor(config?: { token?: string | null; phoneId?: string | null }) {
    this.token = config?.token || process.env.META_WHATSAPP_TOKEN;
    this.phoneId = config?.phoneId || process.env.META_WHATSAPP_PHONE_ID;
  }

  async send(to: string, body: string, template?: WhatsAppTemplateMeta): Promise<WhatsAppSendResult> {
    if (!this.token || !this.phoneId) {
      return { status: "FAILED", failedReason: "META_WHATSAPP_TOKEN / META_WHATSAPP_PHONE_ID not configured" };
    }

    const payload = template
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template.templateName,
            language: { code: template.languageCode },
            components: template.bodyParams.length > 0 ? [{ type: "body", parameters: template.bodyParams.map((text) => ({ type: "text", text })) }] : undefined,
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        };

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { status: "FAILED", failedReason: `Meta API ${res.status}: ${errorText}` };
      }

      const data = (await res.json()) as { messages?: { id: string }[] };
      return { status: "SENT", providerMessageId: data.messages?.[0]?.id };
    } catch (error) {
      return { status: "FAILED", failedReason: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}
