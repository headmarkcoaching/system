import "server-only";
import { db } from "@/lib/db";
import type { CommunicationType } from "@prisma/client";

export interface LogCommunicationInput {
  type: CommunicationType;
  studentId?: string;
  recipientName?: string;
  subject?: string;
  messageSummary: string;
  staffId: string;
}

export function logCommunication(input: LogCommunicationInput) {
  return db.communicationLog.create({ data: input });
}

export function listForStudent(studentId: string) {
  return db.communicationLog.findMany({ where: { studentId }, include: { staff: true }, orderBy: { createdAt: "desc" } });
}

export function listAll(limit = 200) {
  return db.communicationLog.findMany({ include: { staff: true, student: true }, orderBy: { createdAt: "desc" }, take: limit });
}
