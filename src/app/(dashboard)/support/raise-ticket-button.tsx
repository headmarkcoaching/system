"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { createTicketAction } from "./actions";

const CATEGORY_OPTIONS = [
  { value: "ACADEMIC", label: "Academic" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "PAYMENT", label: "Payment" },
  { value: "ACCOUNT", label: "Account" },
  { value: "OTHER", label: "Other" },
];

const fields: FieldDef[] = [
  { type: "select", name: "category", label: "Category", required: true, options: CATEGORY_OPTIONS },
  { type: "text", name: "subject", label: "Subject", required: true, placeholder: "Brief summary of the issue" },
  { type: "textarea", name: "description", label: "Description", required: true, placeholder: "Describe the issue in detail" },
  { type: "text", name: "attachmentUrl", label: "Attachment URL (optional)", placeholder: "https://…" },
];

export function RaiseTicketButton() {
  const router = useRouter();

  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Raise Ticket
        </Button>
      }
      title="Raise Support Ticket"
      fields={fields}
      onSubmit={createTicketAction}
      onSuccess={(result) => {
        const ticketId = (result as { ticketId?: string } | undefined)?.ticketId;
        if (ticketId) router.push(`/support/${ticketId}`);
      }}
    />
  );
}
