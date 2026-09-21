import "server-only";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { ConsoleWhatsAppProvider } from "@/lib/whatsapp/providers/console-provider";
import { MetaCloudApiProvider } from "@/lib/whatsapp/providers/meta-cloud-api";
import { TwilioWhatsAppProvider } from "@/lib/whatsapp/providers/twilio";
import * as integrationSettingsService from "@/lib/services/integration-settings";

/** IntegrationSettings (Settings → Integrations, set by the Super Admin) takes priority over
 * WHATSAPP_PROVIDER/env vars — falls back to env when the DB row still says CONSOLE and no env
 * var overrides it, so an existing env-only deployment keeps working unchanged. */
export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  const provider = settings.whatsappProvider !== "CONSOLE" ? settings.whatsappProvider : process.env.WHATSAPP_PROVIDER?.toUpperCase();

  switch (provider) {
    case "META":
      return new MetaCloudApiProvider({ token: settings.metaWhatsappToken, phoneId: settings.metaWhatsappPhoneId });
    case "TWILIO":
      return new TwilioWhatsAppProvider({ accountSid: settings.twilioAccountSid, authToken: settings.twilioAuthToken, from: settings.twilioWhatsappFrom });
    default:
      return new ConsoleWhatsAppProvider();
  }
}

export type { WhatsAppProvider, WhatsAppSendResult } from "@/lib/whatsapp/provider";
