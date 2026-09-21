import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentHomeworkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const homework = student ? await studentService.getStudentHomework(student.id) : [];

  const bySubject = new Map<string, { id: string; name: string; total: number; pending: number }>();
  for (const h of homework) {
    const subject = h.homework.subject;
    const entry = bySubject.get(subject.id) ?? { id: subject.id, name: subject.name, total: 0, pending: 0 };
    entry.total += 1;
    if (h.status === "PENDING" || h.status === "RESUBMISSION_REQUESTED") entry.pending += 1;
    bySubject.set(subject.id, entry);
  }
  const subjects = Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Submit your work before the due date. Open a subject to see its assignments." />

      {subjects.length === 0 ? (
        <EmptyState title="No homework assigned yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                  {subject.pending > 0 && <Badge variant="warning">{subject.pending} pending</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  {subject.total} assignment{subject.total === 1 ? "" : "s"}
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/student/homework/subject/${subject.id}`}>
                    View Homework <ArrowRight className="ml-1.5 h-4 w-4" />
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
