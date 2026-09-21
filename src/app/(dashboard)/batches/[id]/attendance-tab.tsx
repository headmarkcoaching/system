"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatDate } from "@/lib/utils";
import { markAttendanceAction } from "@/app/(dashboard)/admin/batches/actions";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "PARTIAL";
const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "PARTIAL"];

interface LiveClassOption {
  id: string;
  title: string;
  scheduledDate: Date;
  subjectId: string;
}

export function AttendanceTab({
  batchId,
  classes,
  students,
  existingAttendance,
  canManage,
  history,
}: {
  batchId: string;
  classes: LiveClassOption[];
  students: { id: string; fullName: string }[];
  existingAttendance: { studentId: string; liveClassId: string; status: string }[];
  canManage: boolean;
  history: { id: string; date: Date; status: string; isAutoDetected?: boolean; student: { fullName: string }; liveClass: { title: string } }[];
}) {
  const [selectedClassId, setSelectedClassId] = React.useState(classes[0]?.id ?? "");
  const [statuses, setStatuses] = React.useState<Record<string, AttendanceStatus>>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const forClass = existingAttendance.filter((a) => a.liveClassId === selectedClassId);
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      map[s.id] = (forClass.find((a) => a.studentId === s.id)?.status as AttendanceStatus) ?? "PRESENT";
    });
    setStatuses(map);
  }, [selectedClassId, existingAttendance, students]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  async function handleSubmit() {
    if (!selectedClass) return;
    setPending(true);
    try {
      const entries = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      await markAttendanceAction(batchId, selectedClass.id, selectedClass.subjectId, selectedClass.scheduledDate.toISOString(), entries);
      toast.success("Attendance saved");
    } catch {
      toast.error("Could not save attendance.");
    } finally {
      setPending(false);
    }
  }

  const historyColumns: DataTableColumn<(typeof history)[number]>[] = [
    { key: "date", header: "Date", cell: (r) => formatDate(r.date) },
    { key: "student", header: "Student", cell: (r) => r.student.fullName },
    { key: "class", header: "Class", cell: (r) => r.liveClass.title },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.isAutoDetected && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground" title="Estimated from tab activity, not manually verified">
              Auto (estimated)
            </span>
          )}
        </div>
      ),
    },
  ];

  if (classes.length === 0) {
    return <EmptyState title="Schedule a live class first" description="Attendance is recorded against a specific live class." />;
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="sm:w-80"><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} — {formatDate(c.scheduledDate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Saving…" : "Save Attendance"}
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium">{s.fullName}</span>
                <div className="flex gap-1">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatuses((s2) => ({ ...s2, [s.id]: status }))}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        statuses[s.id] === status ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent Attendance History</h3>
        <DataTable columns={historyColumns} data={history} rowKey={(r) => r.id} emptyTitle="No attendance recorded yet" />
      </div>
    </div>
  );
}
