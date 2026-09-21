import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MaterialItem } from "../../material-item";

export default async function StudentStudyMaterialSubjectPage({ params }: { params: { subjectId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const [material, progressRows] = await Promise.all([
    student ? studentService.getStudentStudyMaterial(student.id) : Promise.resolve([]),
    student ? contentProgressService.listContentProgressForStudent(student.id, "STUDY_MATERIAL") : Promise.resolve([]),
  ]);

  const filtered = material.filter((m) => m.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

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
      <ul className="space-y-2">
        {filtered.map((m) => (
          <MaterialItem
            key={m.id}
            material={{ id: m.id, title: m.title, chapter: m.chapter, type: m.type, fileId: m.fileId, fileUrl: m.fileUrl, mimeType: m.file?.mimeType ?? null, read: readIds.has(m.id) }}
          />
        ))}
      </ul>
    </div>
  );
}
