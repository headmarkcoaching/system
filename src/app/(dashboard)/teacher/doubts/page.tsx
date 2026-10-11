import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as doubtService from "@/lib/services/doubts";
import { PageHeader } from "@/components/shared/page-header";
import { DoubtFilterTabs, DoubtTable } from "@/components/shared/doubt-table";
import type { DoubtStatus } from "@prisma/client";

const VALID = ["OPEN", "ANSWERED", "RESOLVED", "ALL"];

export default async function TeacherDoubtsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const filter = VALID.includes(searchParams.status ?? "") ? (searchParams.status as string) : "OPEN";
  const teacher = await staffService.getTeacherByUserId(session.user.id);
  const doubts = teacher ? await doubtService.listDoubtsForTeacher(teacher.id, filter === "ALL" ? undefined : (filter as DoubtStatus)) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Doubts"
        description="Questions from students in the batches and subjects you teach. A doubt waiting more than 24 hours is flagged to the office."
      />
      <DoubtFilterTabs basePath="/teacher/doubts" active={filter} />
      <DoubtTable doubts={doubts} showBatch />
    </div>
  );
}
