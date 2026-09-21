import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as whatsappService from "@/lib/services/whatsapp";
import * as emailService from "@/lib/services/email";
import * as smsService from "@/lib/services/sms";
import * as notificationService from "@/lib/services/notifications";
import * as announcementService from "@/lib/services/announcements";
import * as communicationService from "@/lib/services/communication";
import * as academicService from "@/lib/services/academic-structure";
import * as batchService from "@/lib/services/batches";
import { formatDate } from "@/lib/utils";
import { MessageCircle, Mail, Smartphone } from "lucide-react";
import { WhatsAppCampaignDialog, EmailCampaignDialog, SmsCampaignDialog, NotificationCampaignDialog } from "./campaign-dialogs";
import { CreateAnnouncementDialog } from "../announcements/create-dialog";

const AUDIENCE_LABELS: Record<string, string> = {
  ALL_STUDENTS: "All Students",
  ACADEMIC_LEVEL: "Academic Level",
  BATCH: "Batch",
  PARENTS: "Parents",
  TEACHERS: "Teachers",
};

export default async function CommunicationCenterPage() {
  const [
    whatsappCounts,
    whatsappMessages,
    emailCounts,
    emailMessages,
    smsCounts,
    smsMessages,
    notifications,
    announcements,
    commLogs,
    levels,
    batches,
  ] = await Promise.all([
    whatsappService.messageStatusCounts(),
    whatsappService.listMessages(),
    emailService.messageStatusCounts(),
    emailService.listMessages(),
    smsService.messageStatusCounts(),
    smsService.listMessages(),
    notificationService.listAll(),
    announcementService.listAllAnnouncements(),
    communicationService.listAll(),
    academicService.listAcademicLevels(),
    batchService.listBatchesForPicker(),
  ]);

  const pickerProps = { levels: levels.filter((l) => l.isActive), batches };

  const whatsappColumns: DataTableColumn<(typeof whatsappMessages)[number]>[] = [
    { key: "phone", header: "Recipient", cell: (r) => r.recipientPhone },
    { key: "template", header: "Template", cell: (r) => r.template?.name ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "sentAt", header: "Sent At", cell: (r) => (r.sentAt ? formatDate(r.sentAt) : "—"), hideOnMobile: true },
    { key: "createdAt", header: "Queued At", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  const emailColumns: DataTableColumn<(typeof emailMessages)[number]>[] = [
    { key: "email", header: "Recipient", cell: (r) => r.recipientEmail },
    { key: "subject", header: "Subject", cell: (r) => r.subject },
    { key: "template", header: "Template", cell: (r) => r.template?.name ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "sentAt", header: "Sent At", cell: (r) => (r.sentAt ? formatDate(r.sentAt) : "—"), hideOnMobile: true },
    { key: "createdAt", header: "Queued At", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  const smsColumns: DataTableColumn<(typeof smsMessages)[number]>[] = [
    { key: "phone", header: "Recipient", cell: (r) => r.recipientPhone },
    { key: "body", header: "Message", cell: (r) => <span className="text-sm">{r.body}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "sentAt", header: "Sent At", cell: (r) => (r.sentAt ? formatDate(r.sentAt) : "—"), hideOnMobile: true },
    { key: "createdAt", header: "Queued At", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  const notificationColumns: DataTableColumn<(typeof notifications)[number]>[] = [
    { key: "recipient", header: "Recipient", cell: (r) => r.user.name },
    { key: "title", header: "Title", cell: (r) => r.title },
    { key: "type", header: "Type", cell: (r) => <StatusBadge status={r.type} /> },
    { key: "read", header: "Read", cell: (r) => (r.isRead ? "Yes" : "No") },
    { key: "createdAt", header: "Sent At", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  const commLogColumns: DataTableColumn<(typeof commLogs)[number]>[] = [
    { key: "type", header: "Type", cell: (r) => <StatusBadge status={r.type} /> },
    { key: "student", header: "Student", cell: (r) => r.student?.fullName ?? r.recipientName ?? "—" },
    { key: "summary", header: "Summary", cell: (r) => <span className="text-sm">{r.messageSummary}</span> },
    { key: "staff", header: "Logged By", cell: (r) => r.staff.name, hideOnMobile: true },
    { key: "createdAt", header: "Date", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Communication Center" description="Every channel the academy uses to reach students and parents — see what's gone out, and send to any audience from here." />

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="logs">Communication Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <div className="flex justify-end">
            <WhatsAppCampaignDialog {...pickerProps} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Queued" value={whatsappCounts.QUEUED} icon={MessageCircle} />
            <StatCard label="Sent" value={whatsappCounts.SENT} icon={MessageCircle} tone="success" />
            <StatCard label="Delivered" value={whatsappCounts.DELIVERED} icon={MessageCircle} tone="success" />
            <StatCard label="Read" value={whatsappCounts.READ} icon={MessageCircle} tone="success" />
            <StatCard label="Failed" value={whatsappCounts.FAILED} icon={MessageCircle} tone="destructive" />
          </div>
          <DataTable columns={whatsappColumns} data={whatsappMessages} rowKey={(r) => r.id} emptyTitle="No WhatsApp messages yet" />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="flex justify-end">
            <EmailCampaignDialog {...pickerProps} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Queued" value={emailCounts.QUEUED} icon={Mail} />
            <StatCard label="Sent" value={emailCounts.SENT} icon={Mail} tone="success" />
            <StatCard label="Failed" value={emailCounts.FAILED} icon={Mail} tone="destructive" />
          </div>
          <DataTable columns={emailColumns} data={emailMessages} rowKey={(r) => r.id} emptyTitle="No emails yet" />
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <div className="flex justify-end">
            <SmsCampaignDialog {...pickerProps} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Queued" value={smsCounts.QUEUED} icon={Smartphone} />
            <StatCard label="Sent" value={smsCounts.SENT} icon={Smartphone} tone="success" />
            <StatCard label="Failed" value={smsCounts.FAILED} icon={Smartphone} tone="destructive" />
          </div>
          <p className="text-xs text-muted-foreground">No real SMS provider is configured yet — sends go through a console-only channel (logged, not delivered to an actual phone).</p>
          <DataTable columns={smsColumns} data={smsMessages} rowKey={(r) => r.id} emptyTitle="No SMS messages yet" />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-end">
            <NotificationCampaignDialog {...pickerProps} />
          </div>
          <DataTable columns={notificationColumns} data={notifications} rowKey={(r) => r.id} emptyTitle="No notifications yet" />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-3">
          <div className="flex justify-end">
            <CreateAnnouncementDialog levels={levels.filter((l) => l.isActive)} batches={batches} />
          </div>
          {announcements.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            <ul className="space-y-2">
              {announcements.map((a) => (
                <li key={a.id} className="space-y-1 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline">
                      {AUDIENCE_LABELS[a.audience]}
                      {a.academicLevel && ` · ${a.academicLevel.name}`}
                      {a.batch && ` · ${a.batch.name}`}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.publishedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <DataTable columns={commLogColumns} data={commLogs} rowKey={(r) => r.id} emptyTitle="No communication logged yet" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
