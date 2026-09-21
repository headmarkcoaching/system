// Provider-agnostic SMS sending interface — mirrors src/lib/email/provider.ts and
// src/lib/whatsapp/provider.ts. No real SMS provider exists yet (this channel is manual-send
// only, triggered from Communication Center campaigns), but the shape stays ready for one.

export interface SmsSendResult {
  status: "SENT" | "FAILED";
  providerMessageId?: string;
  failedReason?: string;
}

export interface SmsProvider {
  send(to: string, body: string): Promise<SmsSendResult>;
}
