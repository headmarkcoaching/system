import { PageHeader } from "@/components/shared/page-header";
import * as academicService from "@/lib/services/academic-structure";
import * as staffService from "@/lib/services/staff";
import { NewLeadForm } from "./new-lead-form";

export default async function NewLeadPage() {
  const [levels, boards, groups, counselors] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listGroups(),
    staffService.listCounselors(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add Lead" description="Track a new admissions inquiry through the pipeline." />
      <NewLeadForm levels={levels.filter((l) => l.isActive)} boards={boards.filter((b) => b.isActive)} groups={groups.filter((g) => g.isActive)} counselors={counselors} />
    </div>
  );
}
