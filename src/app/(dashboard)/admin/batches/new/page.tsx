import { PageHeader } from "@/components/shared/page-header";
import * as academicService from "@/lib/services/academic-structure";
import { NewBatchForm } from "./new-batch-form";

export default async function NewBatchPage() {
  const [levels, boards, groups, programs] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listGroups(),
    academicService.listPrograms(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Add Batch" description="Students, teachers and subjects can be assigned after saving." />
      <NewBatchForm levels={levels.filter((l) => l.isActive)} boards={boards.filter((b) => b.isActive)} groups={groups.filter((g) => g.isActive)} programs={programs.filter((p) => p.isActive)} />
    </div>
  );
}
