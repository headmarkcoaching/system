// Provider-agnostic email sending interface — mirrors src/lib/whatsapp/provider.ts. Every real
// provider (SMTP, ...) implements this same shape, so swapping providers is a one-file change
// plus an env var, never a rewrite of the automation/notification code that calls it.

export interface EmailSendResult {
  status: "SENT" | "FAILED";
  providerMessageId?: string;
  failedReason?: string;
}

export interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<EmailSendResult>;
}
