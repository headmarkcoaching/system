"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as announcementService from "@/lib/services/announcements";
import * as whatsappService from "@/lib/services/whatsapp";
import * as emailService from "@/lib/services/email";
import * as smsService from "@/lib/services/sms";
import * as notificationService from "@/lib/services/notifications";

const audienceSchema = z.object({
  audience: z.enum(["ALL_STUDENTS", "ACADEMIC_LEVEL", "BATCH", "PARENTS", "TEACHERS"]),
  academicLevelId: z.string().optional(),
  batchId: z.string().optional(),
});

function assertAudienceComplete(data: z.infer<typeof audienceSchema>) {
  if (data.audience === "ACADEMIC_LEVEL" && !data.academicLevelId) return "Select an academic level for this audience.";
  if (data.audience === "BATCH" && !data.batchId) return "Select a batch for this audience.";
  return null;
}

// Every campaign send is best-effort per recipient — one bad phone/email must never sink the
// whole batch — same non-fatal try/catch precedent as createAnnouncement's own triple-channel
// send. Sequential, not Promise.all, matching that same precedent (an academy-sized audience is
// small enough that this never matters for latency, and it keeps provider rate limits honest).

const whatsappSchema = audienceSchema.extend({ body: z.string().min(1, "Message is required") });

export async function sendWhatsAppCampaignAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = whatsappSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const audienceError = assertAudienceComplete(parsed.data);
  if (audienceError) return { error: audienceError };

  const contacts = await announcementService.resolveTargetContacts(parsed.data);
  let sent = 0;
  for (const contact of contacts) {
    if (!contact.phone) continue;
    try {
      await whatsappService.sendMessage({ recipientPhone: contact.phone, recipientUserId: contact.userId, body: parsed.data.body, relatedEntityType: "Campaign" });
      sent += 1;
    } catch (err) {
      console.error("WhatsApp campaign send failed for one recipient", err);
    }
  }

  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "WhatsAppCampaign", entityId: "bulk", after: { audience: parsed.data.audience, sent, targeted: contacts.length } });
  revalidatePath("/admin/communication");
  return { sent, targeted: contacts.length };
}

const emailSchema = audienceSchema.extend({ subject: z.string().min(1, "Subject is required"), body: z.string().min(1, "Message is required") });

export async function sendEmailCampaignAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = emailSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const audienceError = assertAudienceComplete(parsed.data);
  if (audienceError) return { error: audienceError };

  const contacts = await announcementService.resolveTargetContacts(parsed.data);
  let sent = 0;
  for (const contact of contacts) {
    if (!contact.email) continue;
    try {
      await emailService.sendMessage({ recipientEmail: contact.email, recipientUserId: contact.userId, subject: parsed.data.subject, body: parsed.data.body, relatedEntityType: "Campaign" });
      sent += 1;
    } catch (err) {
      console.error("Email campaign send failed for one recipient", err);
    }
  }

  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "EmailCampaign", entityId: "bulk", after: { audience: parsed.data.audience, sent, targeted: contacts.length } });
  revalidatePath("/admin/communication");
  return { sent, targeted: contacts.length };
}

const smsSchema = audienceSchema.extend({ body: z.string().min(1, "Message is required") });

export async function sendSmsCampaignAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = smsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const audienceError = assertAudienceComplete(parsed.data);
  if (audienceError) return { error: audienceError };

  const contacts = await announcementService.resolveTargetContacts(parsed.data);
  let sent = 0;
  for (const contact of contacts) {
    if (!contact.phone) continue;
    try {
      await smsService.sendMessage({ recipientPhone: contact.phone, recipientUserId: contact.userId, body: parsed.data.body, relatedEntityType: "Campaign" });
      sent += 1;
    } catch (err) {
      console.error("SMS campaign send failed for one recipient", err);
    }
  }

  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "SmsCampaign", entityId: "bulk", after: { audience: parsed.data.audience, sent, targeted: contacts.length } });
  revalidatePath("/admin/communication");
  return { sent, targeted: contacts.length };
}

const notificationSchema = audienceSchema.extend({ title: z.string().min(1, "Title is required"), message: z.string().min(1, "Message is required") });

export async function sendNotificationCampaignAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = notificationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const audienceError = assertAudienceComplete(parsed.data);
  if (audienceError) return { error: audienceError };

  const contacts = await announcementService.resolveTargetContacts(parsed.data);
  const userIds = contacts.map((c) => c.userId);
  if (userIds.length > 0) {
    await notificationService.createNotificationsForUsers(userIds, { type: "ANNOUNCEMENT", title: parsed.data.title, message: parsed.data.message });
  }

  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "NotificationCampaign", entityId: "bulk", after: { audience: parsed.data.audience, sent: userIds.length } });
  revalidatePath("/admin/communication");
  return { sent: userIds.length };
}
