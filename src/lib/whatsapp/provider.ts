// Provider-agnostic WhatsApp sending interface. Every real provider (Meta Cloud API,
// Twilio, ...) implements this same shape, so swapping providers is a one-file change
// plus an env var — never a rewrite of the automation/notification code that calls it.

export interface WhatsAppSendResult {
  status: "SENT" | "FAILED";
  providerMessageId?: string;
  failedReason?: string;
}

/**
 * Present only when the template being sent has an approved Meta template name configured
 * (MessageTemplate.metaTemplateName) — required for any business-initiated message sent
 * outside a customer's 24h WhatsApp session window. `bodyParams` are positional, in the same
 * order the placeholders first appear in our own template body (see deriveTemplateParams in
 * services/whatsapp.ts) — register the Meta template with its {{1}}, {{2}}... in that same order.
 */
export interface WhatsAppTemplateMeta {
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}

export interface WhatsAppProvider {
  send(to: string, body: string, template?: WhatsAppTemplateMeta): Promise<WhatsAppSendResult>;
}
