import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";
import * as recordingAccessService from "@/lib/services/recording-access";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { RecordingItem } from "../../recording-item";

export default async function StudentRecordingsSubjectPage({ params }: { params: { subjectId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const [recordings, progressRows] = await Promise.all([
    student ? studentService.getStudentRecordings(student.id) : Promise.resolve([]),
    student ? contentProgressService.listContentProgressForStudent(student.id, "RECORDING") : Promise.resolve([]),
  ]);

  const filtered = recordings.filter((r) => r.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

  const subjectName = filtered[0].subject.name;
  const progressByRecording = new Map(progressRows.map((p) => [p.contentId, p]));
  const accessByRecording = student ? await recordingAccessService.getRecordingAccessMap(student.id, filtered) : new Map();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subjectName} — Recordings`}
        description="Progress is tracked automatically for embedded video; otherwise mark it complete once you've watched it."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/recordings">Back to Subjects</Link>
          </Button>
        }
      />
      <ul className="space-y-2">
        {filtered.map((r) => {
          const p = progressByRecording.get(r.id);
          return (
            <RecordingItem
              key={r.id}
              recording={{
                id: r.id,
                title: r.title,
                recordingDate: r.recordingDate,
                recordingUrl: r.recordingUrl,
                isDirectVideo: contentProgressService.isDirectVideoUrl(r.recordingUrl),
                progress: p ? { completionPercent: p.completionPercent, completed: p.completed, lastPositionSeconds: p.lastPositionSeconds } : null,
                access: accessByRecording.get(r.id) ?? { isLinked: false, eligible: false, activeUntil: null },
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
