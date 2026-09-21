import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const attendance = student ? await studentService.getStudentAttendance(student.id) : [];

  const bySubject = new Map<string, { id: string; name: string; records: { status: string }[] }>();
  for (const a of attendance) {
    const subject = a.liveClass.subject;
    const entry = bySubject.get(subject.id) ?? { id: subject.id, name: subject.name, records: [] };
    entry.records.push({ status: a.status });
    bySubject.set(subject.id, entry);
  }
  const subjects = Array.from(bySubject.values())
    .map((s) => ({ id: s.id, name: s.name, total: s.records.length, rate: studentService.computeAttendanceRate(s.records) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Open a subject to see your full attendance history." />

      {subjects.length === 0 ? (
        <EmptyState title="No attendance recorded yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                  <Badge variant={subject.rate >= 75 ? "success" : subject.rate >= 50 ? "warning" : "destructive"}>{subject.rate}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarCheck className="h-4 w-4" />
                  {subject.total} class{subject.total === 1 ? "" : "es"} recorded
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/student/attendance/subject/${subject.id}`}>
                    View Attendance <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
