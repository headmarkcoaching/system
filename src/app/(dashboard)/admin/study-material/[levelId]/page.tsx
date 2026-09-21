import { notFound } from "next/navigation";
import Link from "next/link";
import * as studyMaterialService from "@/lib/services/study-material";
import * as academicService from "@/lib/services/academic-structure";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LevelMaterialList } from "./level-material-list";

export default async function LevelStudyMaterialPage({ params }: { params: { levelId: string } }) {
  const [levels, subjects, materials] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listSubjects(),
    studyMaterialService.listStudyMaterial({ academicLevelId: params.levelId }),
  ]);

  const level = levels.find((l) => l.id === params.levelId);
  if (!level) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${level.name} — Study Material`}
        description="Notes, past papers and worksheets for this level."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/study-material">Back to Levels</Link>
          </Button>
        }
      />
      <LevelMaterialList levelId={level.id} materials={materials} subjects={subjects.filter((s) => s.isActive)} />
    </div>
  );
}
