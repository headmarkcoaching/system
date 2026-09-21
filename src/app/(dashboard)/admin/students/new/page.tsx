import { PageHeader } from "@/components/shared/page-header";
import * as academicService from "@/lib/services/academic-structure";
import { NewStudentForm } from "./new-student-form";

export default async function NewStudentPage() {
  const [levels, boards, groups] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listGroups(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add Student" description="Create a new student profile. Parents and batch enrollment can be linked after saving." />
      <NewStudentForm levels={levels.filter((l) => l.isActive)} boards={boards.filter((b) => b.isActive)} groups={groups.filter((g) => g.isActive)} />
    </div>
  );
}
