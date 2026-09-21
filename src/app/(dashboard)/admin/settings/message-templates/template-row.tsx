"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import type { MessageTemplateKey } from "@prisma/client";
import { updateMessageTemplateAction } from "./actions";

const fields: FieldDef[] = [
  { type: "textarea", name: "body", label: "WhatsApp Message Body", required: true, placeholder: "Use {{variable}} placeholders" },
  { type: "checkbox", name: "isActive", label: "Active" },
  { type: "text", name: "emailSubject", label: "Email Subject (leave blank to skip email for this rule)", placeholder: "Use {{variable}} placeholders" },
  { type: "textarea", name: "emailBody", label: "Email Body", placeholder: "Use {{variable}} placeholders" },
  { type: "text", name: "metaTemplateName", label: "Meta Approved Template Name (WhatsApp, optional)", placeholder: "e.g. class_reminder_v1 — leave blank to send as plain text" },
  { type: "text", name: "metaTemplateLanguage", label: "Meta Template Language Code", placeholder: "en" },
];

export function TemplateRow({
  templateKey,
  name,
  body,
  isActive,
  emailSubject,
  emailBody,
  metaTemplateName,
  metaTemplateLanguage,
}: {
  templateKey: MessageTemplateKey;
  name: string;
  body: string;
  isActive: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  metaTemplateName: string | null;
  metaTemplateLanguage: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {!isActive && <Badge variant="outline">Inactive</Badge>}
          {emailBody && <Badge variant="secondary">Email configured</Badge>}
          {metaTemplateName && <Badge variant="secondary">Meta template: {metaTemplateName}</Badge>}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{body}</p>
      </div>
      <EntityDialog
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Pencil className="h-4 w-4" />
          </Button>
        }
        title={`Edit "${name}"`}
        description="Available variables: {{student_name}}, {{parent_name}}, {{class_name}}, {{batch_name}}, {{subject}}, {{date}}, {{time}}, {{payment_amount}}"
        fields={fields}
        defaultValues={{ body, isActive, emailSubject: emailSubject ?? "", emailBody: emailBody ?? "", metaTemplateName: metaTemplateName ?? "", metaTemplateLanguage: metaTemplateLanguage ?? "en" }}
        onSubmit={(data) => updateMessageTemplateAction(templateKey, data)}
      />
    </div>
  );
}
