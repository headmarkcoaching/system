import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ChapterFilterNotice } from "@/components/shared/lecture-bundle";
import { chapterMatches } from "@/lib/lecture-bundle";
import { MaterialItem } from "../../material-item";

export default async function StudentStudyMaterialSubjectPage({ params, searchParams }: { params: { subjectId: string }; searchParams: { chapter?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const [material, progressRows] = await Promise.all([
    student ? studentService.getStudentStudyMaterial(student.id) : Promise.resolve([]),
    student ? contentProgressService.listContentProgressForStudent(student.id, "STUDY_MATERIAL") : Promise.resolve([]),
  ]);

  const filtered = material.filter((m) => m.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

  const chapter = searchParams.chapter?.trim() || null;
  const shown = chapter ? filtered.filter((m) => chapterMatches(m.chapter, chapter)) : filtered;
  const subjectName = filtered[0].subject.name;
  const readIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.contentId));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subjectName} — Study Material`}
        description="Notes, past papers and worksheets."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/study-material">Back to Subjects</Link>
          </Button>
        }
      />
      {chapter && <ChapterFilterNotice chapter={chapter} clearHref={`/student/study-material/subject/${params.subjectId}`} />}
      {shown.length === 0 && <EmptyState title="No material for this chapter yet" description="Your teacher hasn't uploaded notes tagged to this chapter." />}
      <ul className="space-y-2">
        {shown.map((m) => (
          <MaterialItem
            key={m.id}
            material={{ id: m.id, title: m.title, chapter: m.chapter, type: m.type, fileId: m.fileId, fileUrl: m.fileUrl, mimeType: m.file?.mimeType ?? null, read: readIds.has(m.id) }}
          />
        ))}
      </ul>
    </div>
  );
}
