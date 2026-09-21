import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function createNotification(userId: string, input: NotificationInput) {
  return db.notification.create({ data: { userId, ...input } });
}

export function createNotificationsForUsers(userIds: string[], input: NotificationInput) {
  return db.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...input })),
  });
}

export function listForUser(userId: string, limit = 20) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}

/** Academy-wide view for the Communication Center (admin only) — every notification, any recipient. */
export function listAll(limit = 200) {
  return db.notification.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: limit });
}

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, isRead: false } });
}

export function markRead(id: string, userId: string) {
  return db.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export function markAllRead(userId: string) {
  return db.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
