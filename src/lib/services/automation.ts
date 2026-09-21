import "server-only";
import { db } from "@/lib/db";
import type { AutomationRuleKey, AutomationStatus, NotificationType, MessageTemplateKey } from "@prisma/client";
import * as notificationService from "@/lib/services/notifications";
import * as whatsappService from "@/lib/services/whatsapp";
import * as emailService from "@/lib/services/email";
import * as commPrefsService from "@/lib/services/communication-preferences";

export function listRules() {
  return db.automationRule.findMany({ orderBy: { key: "asc" } });
}

export function getRule(key: AutomationRuleKey) {
  return db.automationRule.findUnique({ where: { key } });
}

/** Typed accessor: returns the rule's config merged over sane defaults, and whether it's active. */
export async function getRuleConfig<T extends Record<string, number>>(key: AutomationRuleKey, defaults: T): Promise<{ isActive: boolean; config: T }> {
  const rule = await getRule(key);
  if (!rule) return { isActive: true, config: defaults };
  return { isActive: rule.isActive, config: { ...defaults, ...(rule.config as unknown as Partial<T>) } };
}

export function updateRule(key: AutomationRuleKey, data: { isActive: boolean; config: Record<string, number> }, updatedById: string) {
  return db.automationRule.update({ where: { key }, data: { ...data, updatedById } });
}

export interface LogAutomationInput {
  ruleKey: AutomationRuleKey;
  studentId?: string;
  leadId?: string;
  action: string;
  status?: AutomationStatus;
  details?: Record<string, unknown>;
}

export function logAutomation(input: LogAutomationInput) {
  return db.automationLog.create({
    data: {
      ruleKey: input.ruleKey,
      studentId: input.studentId,
      leadId: input.leadId,
      action: input.action,
      status: input.status ?? "SUCCESS",
      details: input.details as never,
    },
  });
}

export function listLogs(filters?: { ruleKey?: AutomationRuleKey; studentId?: string; leadId?: string }) {
  return db.automationLog.findMany({
    where: {
      ruleKey: filters?.ruleKey,
      studentId: filters?.studentId,
      leadId: filters?.leadId,
    },
    include: { student: true, lead: true },
    orderBy: { triggeredAt: "desc" },
    take: 200,
  });
}

/** Has this exact rule+marker combination already fired? Used to avoid re-notifying on every poll. */
export async function hasFiredRecently(ruleKey: AutomationRuleKey, scope: string | null, marker: string, scopeField: "studentId" | "leadId" = "studentId") {
  const existing = await db.automationLog.findFirst({
    where: { ruleKey, [scopeField]: scope ?? undefined, details: { path: ["marker"], equals: marker } },
  });
  return !!existing;
}

export interface DispatchAlertInput {
  userIds: string[];
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  whatsapp?: {
    phone: string;
    userId?: string;
    templateKey: MessageTemplateKey;
    variables: Record<string, string | number | undefined | null>;
  }[];
  /** Same recipients as `whatsapp`, but only for those with an email address — pass `email`
   * alongside `phone` on the same contact objects when mapping recipients. */
  email?: {
    email: string;
    userId?: string;
    templateKey: MessageTemplateKey;
    variables: Record<string, string | number | undefined | null>;
  }[];
}

/** In-app notification for each userId, plus (preference-respecting) WhatsApp/email messages. */
export async function dispatchAlert(input: DispatchAlertInput) {
  if (input.userIds.length > 0) {
    await notificationService.createNotificationsForUsers(input.userIds, {
      type: input.notificationType,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    });
  }

  for (const wa of input.whatsapp ?? []) {
    const allowed = await commPrefsService.shouldSendWhatsApp(wa.userId, input.notificationType);
    if (!allowed) continue;
    await whatsappService.sendMessage({
      recipientPhone: wa.phone,
      recipientUserId: wa.userId,
      templateKey: wa.templateKey,
      variables: wa.variables,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    });
  }

  for (const em of input.email ?? []) {
    const allowed = await commPrefsService.shouldSendEmail(em.userId, input.notificationType);
    if (!allowed) continue;
    await emailService.sendMessage({
      recipientEmail: em.email,
      recipientUserId: em.userId,
      templateKey: em.templateKey,
      variables: em.variables,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    });
  }
}
