import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

/** These notification types bypass user preference — the academy controls delivery for them. */
const CRITICAL_NOTIFICATION_TYPES: NotificationType[] = ["PAYMENT_REMINDER", "PERFORMANCE_ALERT", "ATTENDANCE_ALERT"];

export function isCriticalNotificationType(type: NotificationType) {
  return CRITICAL_NOTIFICATION_TYPES.includes(type);
}

export async function getPreference(userId: string) {
  return db.communicationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export function updatePreference(userId: string, data: { whatsappEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean }) {
  return db.communicationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

/** Whether a WhatsApp message of this notification type should actually be sent to this user. */
export async function shouldSendWhatsApp(userId: string | undefined, type: NotificationType) {
  if (isCriticalNotificationType(type)) return true;
  if (!userId) return true;
  const pref = await getPreference(userId);
  return pref.whatsappEnabled;
}

/** Whether an email of this notification type should actually be sent to this user. */
export async function shouldSendEmail(userId: string | undefined, type: NotificationType) {
  if (isCriticalNotificationType(type)) return true;
  if (!userId) return true;
  const pref = await getPreference(userId);
  return pref.emailEnabled;
}
