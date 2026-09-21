"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as integrationSettingsService from "@/lib/services/integration-settings";

function revalidate() {
  revalidatePath("/admin/settings/integrations");
}

const whatsappSchema = z.object({
  whatsappProvider: z.enum(["CONSOLE", "META", "TWILIO"]),
  metaWhatsappToken: z.string().optional(),
  metaWhatsappPhoneId: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioWhatsappFrom: z.string().optional(),
});

export async function updateWhatsAppSettingsAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(SUPER_ADMIN_ONLY);
  const parsed = whatsappSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await integrationSettingsService.updateWhatsAppSettings(parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "IntegrationSettings", entityId: "whatsapp", after: { whatsappProvider: parsed.data.whatsappProvider } });
  revalidate();
}

const emailSchema = z.object({
  emailProvider: z.enum(["CONSOLE", "SMTP"]),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().optional(),
});

export async function updateEmailSettingsAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(SUPER_ADMIN_ONLY);
  const parsed = emailSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await integrationSettingsService.updateEmailSettings(parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "IntegrationSettings", entityId: "email", after: { emailProvider: parsed.data.emailProvider } });
  revalidate();
}

const googleClientSchema = z.object({
  googleClientId: z.string().min(1, "Client ID is required"),
  googleClientSecret: z.string().optional(),
});

export async function updateGoogleClientCredentialsAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(SUPER_ADMIN_ONLY);
  const parsed = googleClientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await integrationSettingsService.updateGoogleClientCredentials(parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "IntegrationSettings", entityId: "google_client" });
  revalidate();
}

export async function disconnectGoogleAction() {
  const session = await requireRoleSession(SUPER_ADMIN_ONLY);
  await integrationSettingsService.disconnectGoogle(session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "IntegrationSettings", entityId: "google_disconnect" });
  revalidate();
}

const fileStorageSchema = z.object({
  fileStorageProvider: z.enum(["LOCAL", "GOOGLE_DRIVE"]),
});

export async function updateFileStorageProviderAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(SUPER_ADMIN_ONLY);
  const parsed = fileStorageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await integrationSettingsService.updateFileStorageProvider(parsed.data.fileStorageProvider, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "IntegrationSettings", entityId: "file_storage", after: parsed.data });
  revalidate();
}
