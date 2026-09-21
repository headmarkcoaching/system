import "server-only";
import type { EmailProvider } from "@/lib/email/provider";
import { ConsoleEmailProvider } from "@/lib/email/providers/console-provider";
import { SmtpEmailProvider } from "@/lib/email/providers/smtp-provider";
import * as integrationSettingsService from "@/lib/services/integration-settings";

/** IntegrationSettings (Settings → Integrations, set by the Super Admin) takes priority over
 * EMAIL_PROVIDER/env vars — falls back to env when the DB row still says CONSOLE and no env
 * var overrides it, so an existing env-only deployment keeps working unchanged. */
export async function getEmailProvider(): Promise<EmailProvider> {
  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  const provider = settings.emailProvider !== "CONSOLE" ? settings.emailProvider : process.env.EMAIL_PROVIDER?.toUpperCase();

  switch (provider) {
    case "SMTP":
      return new SmtpEmailProvider({ host: settings.smtpHost, port: settings.smtpPort, user: settings.smtpUser, password: settings.smtpPassword, from: settings.smtpFrom });
    default:
      return new ConsoleEmailProvider();
  }
}

export type { EmailProvider, EmailSendResult } from "@/lib/email/provider";
