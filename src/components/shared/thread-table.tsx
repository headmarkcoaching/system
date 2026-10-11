import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { isUnread, type ThreadSide } from "@/lib/services/teacher-messages";

interface ThreadRow {
  id: string;
  subject: string;
  lastMessageAt: Date;
  lastAuthorId: string | null;
  familyReadAt: Date | null;
  teacherReadAt: Date | null;
  teacher: { fullName: string };
  student: { fullName: string };
  startedBy: { name: string };
}

/** Conversation list for one side of a thread. `side` decides which read marker drives the "New"
 * badge, and which counterpart column is shown. */
export function ThreadTable({ threads, side, myUserId, emptyTitle }: { threads: ThreadRow[]; side: ThreadSide; myUserId: string; emptyTitle: string }) {
  const columns: DataTableColumn<ThreadRow>[] = [
    {
      key: "subject",
      header: "Subject",
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className={isUnread(r, side, myUserId) ? "font-semibold" : "font-medium"}>{r.subject}</span>
          {isUnread(r, side, myUserId) && <Badge variant="warning">New</Badge>}
        </span>
      ),
    },
    side === "family"
      ? { key: "with", header: "Teacher", cell: (r) => r.teacher.fullName }
      : { key: "with", header: "From", cell: (r) => r.startedBy.name },
    { key: "about", header: "About", cell: (r) => r.student.fullName, hideOnMobile: true },
    { key: "last", header: "Last message", cell: (r) => formatDate(r.lastMessageAt) },
  ];
  return <DataTable columns={columns} data={threads} rowKey={(r) => r.id} rowHref={(r) => `/messages/${r.id}`} emptyTitle={emptyTitle} />;
}
