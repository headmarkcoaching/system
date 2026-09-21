import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

async function getRow() {
  return db.integrationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

function maskSecret(value: string | null) {
  return value ? "•".repeat(12) : null;
}

/** For display in the settings UI — secrets come back masked, never the real value, so the
 * page can show "a token is set" without ever round-tripping the plaintext back to the browser. */
export async function getIntegrationSettingsForDisplay() {
  const row = await getRow();
  return {
    whatsappProvider: row.whatsappProvider,
    metaWhatsappToken: maskSecret(row.metaWhatsappToken),
    metaWhatsappPhoneId: row.metaWhatsappPhoneId,
    twilioAccountSid: row.twilioAccountSid,
    twilioAuthToken: maskSecret(row.twilioAuthToken),
    twilioWhatsappFrom: row.twilioWhatsappFrom,

    emailProvider: row.emailProvider,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpPassword: maskSecret(row.smtpPassword),
    smtpFrom: row.smtpFrom,

    googleClientId: row.googleClientId,
    googleClientSecretSet: Boolean(row.googleClientSecret),
    googleConnectedEmail: row.googleConnectedEmail,
    googleConnectedAt: row.googleConnectedAt,
    googleCalendarId: row.googleCalendarId,

    fileStorageProvider: row.fileStorageProvider,
  };
}

/** For internal provider use only (whatsapp/email/googlemeet/storage factories) — real
 * decrypted values. Never expose this to the client. */
export async function getIntegrationSettingsInternal() {
  const row = await getRow();
  return {
    whatsappProvider: row.whatsappProvider,
    metaWhatsappToken: row.metaWhatsappToken ? decryptSecret(row.metaWhatsappToken) : null,
    metaWhatsappPhoneId: row.metaWhatsappPhoneId,
    twilioAccountSid: row.twilioAccountSid,
    twilioAuthToken: row.twilioAuthToken ? decryptSecret(row.twilioAuthToken) : null,
    twilioWhatsappFrom: row.twilioWhatsappFrom,

    emailProvider: row.emailProvider,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpPassword: row.smtpPassword ? decryptSecret(row.smtpPassword) : null,
    smtpFrom: row.smtpFrom,

    googleClientId: row.googleClientId,
    googleClientSecret: row.googleClientSecret ? decryptSecret(row.googleClientSecret) : null,
    googleRefreshToken: row.googleRefreshToken ? decryptSecret(row.googleRefreshToken) : null,
    googleCalendarId: row.googleCalendarId,

    fileStorageProvider: row.fileStorageProvider,
  };
}

export interface UpdateWhatsAppSettingsInput {
  whatsappProvider: "CONSOLE" | "META" | "TWILIO";
  metaWhatsappToken?: string;
  metaWhatsappPhoneId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsappFrom?: string;
}

/** A blank secret field means "leave the existing value alone" (the UI shows masked dots, not
 * the real value, so it never resubmits a value it can't read) — only a non-empty value
 * overwrites what's stored. Set the field to the literal string "__clear__" to actually clear it. */
export async function updateWhatsAppSettings(input: UpdateWhatsAppSettingsInput, updatedById: string) {
  await getRow();
  const secretUpdate = (value: string | undefined) => (value === undefined || value === "" ? undefined : value === "__clear__" ? null : encryptSecret(value));

  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: {
      whatsappProvider: input.whatsappProvider,
      metaWhatsappToken: secretUpdate(input.metaWhatsappToken),
      metaWhatsappPhoneId: input.metaWhatsappPhoneId || undefined,
      twilioAccountSid: input.twilioAccountSid || undefined,
      twilioAuthToken: secretUpdate(input.twilioAuthToken),
      twilioWhatsappFrom: input.twilioWhatsappFrom || undefined,
      updatedById,
    },
  });
}

export interface UpdateEmailSettingsInput {
  emailProvider: "CONSOLE" | "SMTP";
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
}

export async function updateEmailSettings(input: UpdateEmailSettingsInput, updatedById: string) {
  await getRow();
  const secretUpdate = (value: string | undefined) => (value === undefined || value === "" ? undefined : value === "__clear__" ? null : encryptSecret(value));

  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: {
      emailProvider: input.emailProvider,
      smtpHost: input.smtpHost || undefined,
      smtpPort: input.smtpPort,
      smtpUser: input.smtpUser || undefined,
      smtpPassword: secretUpdate(input.smtpPassword),
      smtpFrom: input.smtpFrom || undefined,
      updatedById,
    },
  });
}

/** Step 1 of connecting Google: the Super Admin pastes the OAuth Client ID/Secret from their
 * own Google Cloud project — this part genuinely can't be automated (creating a Google Cloud
 * OAuth client requires a human clicking through Google's own console). Step 2 is the actual
 * "Connect Google Account" button, which needs nothing more from here on. */
export async function updateGoogleClientCredentials(input: { googleClientId: string; googleClientSecret?: string }, updatedById: string) {
  await getRow();
  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: {
      googleClientId: input.googleClientId || undefined,
      googleClientSecret: input.googleClientSecret ? encryptSecret(input.googleClientSecret) : undefined,
      updatedById,
    },
  });
}

export async function saveGoogleConnection(input: { refreshToken: string; connectedEmail: string }) {
  await getRow();
  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: {
      googleRefreshToken: encryptSecret(input.refreshToken),
      googleConnectedEmail: input.connectedEmail,
      googleConnectedAt: new Date(),
      googleCalendarId: "primary",
    },
  });
}

export async function disconnectGoogle(updatedById: string) {
  await getRow();
  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: {
      googleRefreshToken: null,
      googleConnectedEmail: null,
      googleConnectedAt: null,
      updatedById,
    },
  });
}

export async function updateFileStorageProvider(provider: "LOCAL" | "GOOGLE_DRIVE", updatedById: string) {
  await getRow();
  return db.integrationSettings.update({
    where: { id: "singleton" },
    data: { fileStorageProvider: provider, updatedById },
  });
}
