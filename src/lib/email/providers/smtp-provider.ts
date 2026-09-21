import "server-only";
import nodemailer from "nodemailer";
import type { EmailProvider, EmailSendResult } from "@/lib/email/provider";

/**
 * Real SMTP provider (nodemailer) — works with Gmail, Outlook, or any mailbox's SMTP
 * credentials. Set EMAIL_PROVIDER=smtp plus SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
 * and SMTP_FROM to activate this instead of the console provider.
 *
 * Gmail specifically requires an "App Password" (Google Account → Security → 2-Step
 * Verification → App Passwords), not the account's normal login password — Google blocks
 * plain-password SMTP logins for security.
 */
export class SmtpEmailProvider implements EmailProvider {
  private readonly host: string | undefined;
  private readonly port: number;
  private readonly user: string | undefined;
  private readonly password: string | undefined;
  private readonly from: string | undefined;

  constructor(config?: { host?: string | null; port?: number | null; user?: string | null; password?: string | null; from?: string | null }) {
    this.host = config?.host || process.env.SMTP_HOST;
    this.port = config?.port || Number(process.env.SMTP_PORT ?? 587);
    this.user = config?.user || process.env.SMTP_USER;
    this.password = config?.password || process.env.SMTP_PASSWORD;
    this.from = config?.from || process.env.SMTP_FROM || this.user;
  }

  async send(to: string, subject: string, body: string): Promise<EmailSendResult> {
    if (!this.host || !this.user || !this.password || !this.from) {
      return { status: "FAILED", failedReason: "SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM not configured" };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: { user: this.user, pass: this.password },
      });

      const info = await transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: body,
      });

      return { status: "SENT", providerMessageId: info.messageId };
    } catch (error) {
      return { status: "FAILED", failedReason: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}
