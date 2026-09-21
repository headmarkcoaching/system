import "server-only";
import { db } from "@/lib/db";
import type { SupportCategory, SupportStatus, SupportPriority } from "@prisma/client";

export interface CreateTicketInput {
  raisedById: string;
  category: SupportCategory;
  subject: string;
  description: string;
  attachmentUrl?: string;
  priority?: SupportPriority;
}

export function createTicket(input: CreateTicketInput) {
  return db.supportTicket.create({ data: input });
}

export function addMessage(ticketId: string, authorId: string, message: string, attachmentUrl?: string) {
  return db.supportMessage.create({ data: { ticketId, authorId, message, attachmentUrl } });
}

export function updateTicketStatus(id: string, status: SupportStatus) {
  return db.supportTicket.update({ where: { id }, data: { status } });
}

export function assignTicket(id: string, assignedToId: string | null) {
  return db.supportTicket.update({ where: { id }, data: { assignedToId } });
}

export function listTicketsForUser(userId: string) {
  return db.supportTicket.findMany({ where: { raisedById: userId }, include: { assignedTo: true }, orderBy: { createdAt: "desc" } });
}

export function listAllTickets(filters?: { status?: SupportStatus; category?: SupportCategory; priority?: SupportPriority }) {
  return db.supportTicket.findMany({
    where: { status: filters?.status, category: filters?.category, priority: filters?.priority },
    include: { raisedBy: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getTicketWithMessages(id: string) {
  return db.supportTicket.findUnique({
    where: { id },
    include: {
      raisedBy: true,
      assignedTo: true,
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
}
