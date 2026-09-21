import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import * as academicService from "@/lib/services/academic-structure";
import * as batchService from "@/lib/services/batches";
import { AcademicLevelsSection, BoardsSection, ProgramsSection, GroupsSection, SubjectsSection, BatchesSection } from "./sections";

export default async function AcademicsPage() {
  const [levels, boards, programs, groups, subjects, batchesResult] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listPrograms(),
    academicService.listGroups(),
    academicService.listSubjects(),
    // A single page (15) comfortably covers this academy's batch count — this tab is a quick
    // at-a-glance list, not a replacement for /admin/batches' own search+pagination.
    batchService.listBatches({}),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        description="Manage academic levels, boards, groups, programs and subjects used across the academy."
      />

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Academic Levels</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="boards">Boards</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>
        <TabsContent value="levels">
          <AcademicLevelsSection levels={levels} />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsSection subjects={subjects} levels={levels} />
        </TabsContent>
        <TabsContent value="boards">
          <BoardsSection boards={boards} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsSection groups={groups} />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramsSection programs={programs} />
        </TabsContent>
        <TabsContent value="batches">
          <BatchesSection batches={batchesResult.items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
