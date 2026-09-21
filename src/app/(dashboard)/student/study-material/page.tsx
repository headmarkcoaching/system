import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FolderOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentStudyMaterialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const [material, progressRows] = await Promise.all([
    student ? studentService.getStudentStudyMaterial(student.id) : Promise.resolve([]),
    student ? contentProgressService.listContentProgressForStudent(student.id, "STUDY_MATERIAL") : Promise.resolve([]),
  ]);
  const readIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.contentId));

  const bySubject = new Map<string, { id: string; name: string; total: number; unread: number }>();
  for (const m of material) {
    const entry = bySubject.get(m.subject.id) ?? { id: m.subject.id, name: m.subject.name, total: 0, unread: 0 };
    entry.total += 1;
    if (!readIds.has(m.id)) entry.unread += 1;
    bySubject.set(m.subject.id, entry);
  }
  const subjects = Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader title="Study Material" description="Notes, past papers and worksheets for your level. Open a subject to see its material." />

      {subjects.length === 0 ? (
        <EmptyState title="No study material available yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                  {subject.unread > 0 && <Badge variant="outline">{subject.unread} unread</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  {subject.total} item{subject.total === 1 ? "" : "s"}
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/student/study-material/subject/${subject.id}`}>
                    View Material <ArrowRight className="ml-1.5 h-4 w-4" />
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
