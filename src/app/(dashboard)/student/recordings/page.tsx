import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Video } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as recordingAccessService from "@/lib/services/recording-access";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentRecordingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const recordings = student ? await studentService.getStudentRecordings(student.id) : [];
  const accessByRecording = student ? await recordingAccessService.getRecordingAccessMap(student.id, recordings) : new Map();

  const bySubject = new Map<string, { id: string; name: string; total: number; unlockable: number }>();
  for (const r of recordings) {
    const entry = bySubject.get(r.subject.id) ?? { id: r.subject.id, name: r.subject.name, total: 0, unlockable: 0 };
    entry.total += 1;
    const access = accessByRecording.get(r.id);
    if (access?.eligible && !access.activeUntil) entry.unlockable += 1;
    bySubject.set(r.subject.id, entry);
  }
  const subjects = Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader title="Recordings" description="Catch up on any class you missed. Open a subject to see its recordings." />

      {subjects.length === 0 ? (
        <EmptyState title="No recordings available yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                  {subject.unlockable > 0 && <Badge variant="warning">{subject.unlockable} to unlock</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" />
                  {subject.total} recording{subject.total === 1 ? "" : "s"}
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/student/recordings/subject/${subject.id}`}>
                    View Recordings <ArrowRight className="ml-1.5 h-4 w-4" />
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
