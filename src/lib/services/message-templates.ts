import "server-only";
import { db } from "@/lib/db";
import type { MessageTemplateKey } from "@prisma/client";

export function listTemplates() {
  return db.messageTemplate.findMany({ orderBy: { key: "asc" } });
}

export function getTemplate(key: MessageTemplateKey) {
  return db.messageTemplate.findUnique({ where: { key } });
}

export interface UpdateTemplateInput {
  body: string;
  isActive: boolean;
  emailSubject?: string;
  emailBody?: string;
  metaTemplateName?: string;
  metaTemplateLanguage?: string;
}

export function updateTemplate(key: MessageTemplateKey, data: UpdateTemplateInput, updatedById: string) {
  return db.messageTemplate.update({
    where: { key },
    data: {
      body: data.body,
      isActive: data.isActive,
      emailSubject: data.emailSubject || null,
      emailBody: data.emailBody || null,
      metaTemplateName: data.metaTemplateName || null,
      metaTemplateLanguage: data.metaTemplateLanguage || "en",
      updatedById,
    },
  });
}
