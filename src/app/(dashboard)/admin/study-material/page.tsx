import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import * as studyMaterialService from "@/lib/services/study-material";
import * as academicService from "@/lib/services/academic-structure";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudyMaterialPage() {
  const [materials, levels] = await Promise.all([studyMaterialService.listStudyMaterial({}), academicService.listAcademicLevels()]);

  const countByLevel = new Map<string, number>();
  for (const m of materials) countByLevel.set(m.academicLevelId, (countByLevel.get(m.academicLevelId) ?? 0) + 1);

  const activeLevels = levels.filter((l) => l.isActive);

  return (
    <div className="space-y-6">
      <PageHeader title="Study Material" description="Organized by academic level. Open a level to see and add its material." />

      {activeLevels.length === 0 ? (
        <EmptyState title="No academic levels set up yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeLevels.map((level) => {
            const count = countByLevel.get(level.id) ?? 0;
            return (
              <Card key={level.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base leading-tight">{level.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {count} item{count === 1 ? "" : "s"}
                  </div>
                  <Button asChild className="mt-auto">
                    <Link href={`/admin/study-material/${level.id}`}>
                      View Material <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
