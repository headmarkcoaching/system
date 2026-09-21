import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ACADEMIC_STAFF_ROLES, ROLE_HOME_PATH, STAFF_ROLES } from "@/lib/permissions";
import * as staffService from "@/lib/services/staff";
import * as studentService from "@/lib/services/students";
import * as academicService from "@/lib/services/academic-structure";
import { PageHeader } from "@/components/shared/page-header";
import { RevisionTopicsPanel } from "./revision-topics-panel";
import { LessonSummaryPanel } from "./lesson-summary-panel";

export default async function TeacherAssistantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ACADEMIC_STAFF_ROLES.includes(session.user.role)) redirect(ROLE_HOME_PATH[session.user.role]);

  let students: { id: string; fullName: string; studentCode: string }[] = [];
  if (session.user.role === "TEACHER") {
    const teacher = await staffService.getTeacherByUserId(session.user.id);
    students = teacher ? await studentService.listStudentsForTeacher(teacher.id) : [];
  } else if (STAFF_ROLES.includes(session.user.role)) {
    students = await studentService.listStudentsForPicker();
  }

  const subjects = await academicService.listSubjects();

  return (
    <div className="space-y-6">
      <PageHeader title="AI Teacher Assistant" description="Suggest revision topics for a student, or draft a lesson summary from your notes." />
      <div className="grid gap-6 lg:grid-cols-2">
        <RevisionTopicsPanel students={students} />
        <LessonSummaryPanel subjects={subjects.filter((s) => s.isActive)} />
      </div>
    </div>
  );
}
