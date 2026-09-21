"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { sendWhatsAppCampaignAction, sendEmailCampaignAction, sendSmsCampaignAction, sendNotificationCampaignAction } from "./actions";

const AUDIENCE_FIELD: FieldDef = {
  type: "select",
  name: "audience",
  label: "Audience",
  required: true,
  options: [
    { value: "ALL_STUDENTS", label: "All Students" },
    { value: "ACADEMIC_LEVEL", label: "Specific Academic Level" },
    { value: "BATCH", label: "Specific Batch" },
    { value: "PARENTS", label: "Parents" },
    { value: "TEACHERS", label: "Teachers" },
  ],
};

function levelAndBatchFields(levels: { id: string; name: string }[], batches: { id: string; name: string }[]): FieldDef[] {
  return [
    { type: "select", name: "academicLevelId", label: "Academic Level (if targeting a level)", options: levels.map((l) => ({ value: l.id, label: l.name })) },
    { type: "select", name: "batchId", label: "Batch (if targeting a batch)", options: batches.map((b) => ({ value: b.id, label: b.name })) },
  ];
}

type Picker = { levels: { id: string; name: string }[]; batches: { id: string; name: string }[] };

export function WhatsAppCampaignDialog({ levels, batches }: Picker) {
  const fields: FieldDef[] = [AUDIENCE_FIELD, ...levelAndBatchFields(levels, batches), { type: "textarea", name: "body", label: "Message", required: true }];
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Send className="mr-1.5 h-3.5 w-3.5" /> New Campaign
        </Button>
      }
      title="Send WhatsApp Campaign"
      description="Sends immediately to everyone in the selected audience who has a phone number on file."
      fields={fields}
      submitLabel="Send"
      onSubmit={sendWhatsAppCampaignAction}
    />
  );
}

export function EmailCampaignDialog({ levels, batches }: Picker) {
  const fields: FieldDef[] = [
    AUDIENCE_FIELD,
    ...levelAndBatchFields(levels, batches),
    { type: "text", name: "subject", label: "Subject", required: true },
    { type: "textarea", name: "body", label: "Message", required: true },
  ];
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Send className="mr-1.5 h-3.5 w-3.5" /> New Campaign
        </Button>
      }
      title="Send Email Campaign"
      description="Sends immediately to everyone in the selected audience who has an email on file."
      fields={fields}
      submitLabel="Send"
      onSubmit={sendEmailCampaignAction}
    />
  );
}

export function SmsCampaignDialog({ levels, batches }: Picker) {
  const fields: FieldDef[] = [AUDIENCE_FIELD, ...levelAndBatchFields(levels, batches), { type: "textarea", name: "body", label: "Message", required: true }];
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Send className="mr-1.5 h-3.5 w-3.5" /> New Campaign
        </Button>
      }
      title="Send SMS Campaign"
      description="No real SMS provider is configured yet — messages send through a console-only channel (logged, not actually delivered to a phone) until one is wired up."
      fields={fields}
      submitLabel="Send"
      onSubmit={sendSmsCampaignAction}
    />
  );
}

export function NotificationCampaignDialog({ levels, batches }: Picker) {
  const fields: FieldDef[] = [
    AUDIENCE_FIELD,
    ...levelAndBatchFields(levels, batches),
    { type: "text", name: "title", label: "Title", required: true },
    { type: "textarea", name: "message", label: "Message", required: true },
  ];
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Send className="mr-1.5 h-3.5 w-3.5" /> New Campaign
        </Button>
      }
      title="Send In-App Notification"
      description="Delivered to every signed-in user in the selected audience's notification bell."
      fields={fields}
      submitLabel="Send"
      onSubmit={sendNotificationCampaignAction}
    />
  );
}
