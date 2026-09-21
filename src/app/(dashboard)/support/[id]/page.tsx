import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCanManageSupportTicket } from "@/lib/access";
import { STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import * as supportService from "@/lib/services/support";
import * as staffService from "@/lib/services/staff";
import { TicketThread } from "./ticket-thread";

const CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  TECHNICAL: "Technical",
  PAYMENT: "Payment",
  ACCOUNT: "Account",
  OTHER: "Other",
};

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await assertCanManageSupportTicket(session, params.id);

  const ticket = await supportService.getTicketWithMessages(params.id);
  if (!ticket) notFound();

  const isStaff = STAFF_ROLES.includes(session.user.role);
  const staffOptions = isStaff ? await staffService.listAdmins() : [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`Raised by ${ticket.raisedBy.name} · ${CATEGORY_LABELS[ticket.category]}`}
        actions={<Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>}
      />
      <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm">{ticket.description}</p>
      {ticket.attachmentUrl && (
        <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
          View Attachment
        </a>
      )}
      <TicketThread
        ticketId={ticket.id}
        status={ticket.status}
        assignedToId={ticket.assignedToId}
        messages={ticket.messages}
        staffOptions={staffOptions}
        isStaff={isStaff}
        currentUserId={session.user.id}
      />
    </div>
  );
}
