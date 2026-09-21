import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileQuestion } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as testService from "@/lib/services/tests";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { categorizeTest } from "./categorize";

export default async function StudentTestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const tests = student ? await testService.listTestsForStudent(student.id) : [];

  const bySubject = new Map<string, { id: string; name: string; total: number; available: number }>();
  for (const t of tests) {
    const entry = bySubject.get(t.subject.id) ?? { id: t.subject.id, name: t.subject.name, total: 0, available: 0 };
    entry.total += 1;
    if (categorizeTest(t) === "available") entry.available += 1;
    bySubject.set(t.subject.id, entry);
  }
  const subjects = Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader title="Tests" description="Available tests, upcoming schedule, and your results. Open a subject to see its tests." />

      {subjects.length === 0 ? (
        <EmptyState title="No tests yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                  {subject.available > 0 && <Badge variant="success">{subject.available} available</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileQuestion className="h-4 w-4" />
                  {subject.total} test{subject.total === 1 ? "" : "s"}
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/student/tests/subject/${subject.id}`}>
                    View Tests <ArrowRight className="ml-1.5 h-4 w-4" />
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
