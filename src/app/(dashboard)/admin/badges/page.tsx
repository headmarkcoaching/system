import { PageHeader } from "@/components/shared/page-header";
import * as gamificationService from "@/lib/services/gamification";
import * as studentService from "@/lib/services/students";
import { BadgesSection } from "./badges-section";

export default async function BadgesPage() {
  const [badges, students] = await Promise.all([gamificationService.listBadges(), studentService.listStudentsForPicker()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Badges" description="Badge catalog for the gamification system. Award badges manually to recognize student achievements." />
      <BadgesSection badges={badges} students={students} />
    </div>
  );
}
