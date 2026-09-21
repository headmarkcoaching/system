import "server-only";
import { db } from "@/lib/db";
import type { AnnouncementAudience, RoleKey } from "@prisma/client";
import * as notificationService from "@/lib/services/notifications";
import * as whatsappService from "@/lib/services/whatsapp";
import * as emailService from "@/lib/services/email";
import * as commPrefsService from "@/lib/services/communication-preferences";

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  academicLevelId?: string;
  batchId?: string;
  createdById: string;
}

export interface TargetContact {
  userId: string;
  phone?: string;
  email?: string;
}

export interface AudienceSelector {
  audience: AnnouncementAudience;
  academicLevelId?: string;
  batchId?: string;
}

/** Resolves an audience (used by Announcements, and reused directly by every Communication
 * Center campaign — WhatsApp/Email/SMS/Notification — so "who does 'All Parents' mean" is
 * answered in exactly one place). */
export async function resolveTargetContacts(input: AudienceSelector): Promise<TargetContact[]> {
  switch (input.audience) {
    case "TEACHERS": {
      const teachers = await db.teacher.findMany({ select: { userId: true, phone: true, email: true } });
      return teachers.map((t) => ({ userId: t.userId, phone: t.phone ?? undefined, email: t.email ?? undefined }));
    }
    case "PARENTS": {
      const parents = await db.parent.findMany({ where: { userId: { not: null } }, select: { userId: true, phone: true, whatsapp: true, email: true } });
      return parents.map((p) => ({ userId: p.userId!, phone: p.whatsapp ?? p.phone ?? undefined, email: p.email ?? undefined })).filter((c) => Boolean(c.userId));
    }
    case "ALL_STUDENTS": {
      const students = await db.student.findMany({ where: { userId: { not: null } }, select: { userId: true, phone: true, whatsapp: true, email: true } });
      return students.map((s) => ({ userId: s.userId!, phone: s.whatsapp ?? s.phone ?? undefined, email: s.email ?? undefined })).filter((c) => Boolean(c.userId));
    }
    case "ACADEMIC_LEVEL": {
      if (!input.academicLevelId) return [];
      const students = await db.student.findMany({ where: { academicLevelId: input.academicLevelId, userId: { not: null } }, select: { userId: true, phone: true, whatsapp: true, email: true } });
      return students.map((s) => ({ userId: s.userId!, phone: s.whatsapp ?? s.phone ?? undefined, email: s.email ?? undefined })).filter((c) => Boolean(c.userId));
    }
    case "BATCH": {
      if (!input.batchId) return [];
      const members = await db.batchStudent.findMany({ where: { batchId: input.batchId }, include: { student: { select: { userId: true, phone: true, whatsapp: true, email: true } } } });
      return members.map((m) => ({ userId: m.student.userId!, phone: m.student.whatsapp ?? m.student.phone ?? undefined, email: m.student.email ?? undefined })).filter((c) => Boolean(c.userId));
    }
    default:
      return [];
  }
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const announcement = await db.announcement.create({
    data: {
      title: input.title,
      message: input.message,
      audience: input.audience,
      academicLevelId: input.academicLevelId || undefined,
      batchId: input.batchId || undefined,
      createdById: input.createdById,
    },
  });

  const contacts = await resolveTargetContacts(input);
  const userIds = contacts.map((c) => c.userId);
  if (userIds.length > 0) {
    await notificationService.createNotificationsForUsers(userIds, {
      type: "ANNOUNCEMENT",
      title: input.title,
      message: input.message,
      relatedEntityType: "Announcement",
      relatedEntityId: announcement.id,
    });
  }

  const variables = { announcement_title: input.title, announcement_message: input.message };
  for (const contact of contacts) {
    if (contact.phone) {
      try {
        const allowed = await commPrefsService.shouldSendWhatsApp(contact.userId, "ANNOUNCEMENT");
        if (allowed) {
          await whatsappService.sendMessage({
            recipientPhone: contact.phone,
            recipientUserId: contact.userId,
            templateKey: "ANNOUNCEMENT",
            variables,
            body: `${input.title}\n\n${input.message}`,
            relatedEntityType: "Announcement",
            relatedEntityId: announcement.id,
          });
        }
      } catch (err) {
        console.error("ANNOUNCEMENT whatsapp send failed", err);
      }
    }

    if (contact.email) {
      try {
        const allowed = await commPrefsService.shouldSendEmail(contact.userId, "ANNOUNCEMENT");
        if (allowed) {
          await emailService.sendMessage({
            recipientEmail: contact.email,
            recipientUserId: contact.userId,
            templateKey: "ANNOUNCEMENT",
            variables,
            relatedEntityType: "Announcement",
            relatedEntityId: announcement.id,
          });
        }
      } catch (err) {
        console.error("ANNOUNCEMENT email send failed", err);
      }
    }
  }

  return announcement;
}

export function listAllAnnouncements() {
  return db.announcement.findMany({
    include: { academicLevel: true, batch: true },
    orderBy: { publishedAt: "desc" },
  });
}

export function listAnnouncementsForBatch(batchId: string) {
  return db.announcement.findMany({ where: { batchId }, orderBy: { publishedAt: "desc" } });
}

/** Resolves what a given signed-in user should see on their dashboard, per the spec's audience targeting rules. */
export async function listAnnouncementsForUser(userId: string, role: RoleKey): Promise<Awaited<ReturnType<typeof listAllAnnouncements>>> {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return listAllAnnouncements();
  }

  if (role === "TEACHER") {
    return db.announcement.findMany({ where: { audience: "TEACHERS" }, include: { academicLevel: true, batch: true }, orderBy: { publishedAt: "desc" } });
  }

  if (role === "PARENT") {
    return db.announcement.findMany({ where: { audience: "PARENTS" }, include: { academicLevel: true, batch: true }, orderBy: { publishedAt: "desc" } });
  }

  if (role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId }, include: { batchMemberships: true } });
    if (!student) return [];
    const batchIds = student.batchMemberships.map((b) => b.batchId);
    return db.announcement.findMany({
      where: {
        OR: [
          { audience: "ALL_STUDENTS" },
          { audience: "ACADEMIC_LEVEL", academicLevelId: student.academicLevelId },
          { audience: "BATCH", batchId: { in: batchIds } },
        ],
      },
      include: { academicLevel: true, batch: true },
      orderBy: { publishedAt: "desc" },
      take: 10,
    });
  }

  return [];
}
