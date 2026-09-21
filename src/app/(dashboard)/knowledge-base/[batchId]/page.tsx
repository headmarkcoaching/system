import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as batchService from "@/lib/services/batches";
import * as staffService from "@/lib/services/staff";
import * as kbService from "@/lib/services/knowledge-base";
import { KNOWLEDGE_BASE_ACCESS_ROLES, KNOWLEDGE_BASE_REVIEWER_ROLES, ACADEMIC_STAFF_ROLES, STAFF_ROLES, ROLE_HOME_PATH } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BatchKnowledgeList } from "./batch-knowledge-list";

export default async function BatchKnowledgeBasePage({ params }: { params: { batchId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!KNOWLEDGE_BASE_ACCESS_ROLES.includes(session.user.role)) redirect(ROLE_HOME_PATH[session.user.role]);

  const isStaff = STAFF_ROLES.includes(session.user.role);
  // Counselors review across every class like staff — only an actual Teacher needs the
  // "are you assigned to this specific batch" ownership check and per-subject narrowing below.
  const isUnrestrictedReviewer = isStaff || session.user.role === "COUNSELOR";
  let viewerTeacherId: string | undefined;

  if (!isUnrestrictedReviewer) {
    const teacher = await staffService.getTeacherByUserId(session.user.id);
    viewerTeacherId = teacher?.id;
    const assigned = viewerTeacherId ? await db.batchTeacher.findFirst({ where: { batchId: params.batchId, teacherId: viewerTeacherId } }) : null;
    if (!assigned) redirect("/knowledge-base");
  }

  const batch = await batchService.getBatchById(params.batchId);
  if (!batch) notFound();

  // Same per-subject teacher scoping as the batch detail page — a teacher only sees/adds notes
  // for the subject(s) they actually teach in this batch, not every subject a co-teacher owns.
  const ownSubjectIds = viewerTeacherId
    ? Array.from(new Set(batch.teachers.filter((t) => t.teacherId === viewerTeacherId && t.subjectId).map((t) => t.subjectId!)))
    : [];
  const restrictToOwnSubjects = Boolean(viewerTeacherId) && ownSubjectIds.length > 0;
  const availableSubjects = restrictToOwnSubjects ? batch.subjects.filter((s) => ownSubjectIds.includes(s.subjectId)) : batch.subjects;
  const relevantSubjectIds = availableSubjects.map((s) => s.subjectId);

  const documents = await kbService.listDocumentsForBatch(batch, relevantSubjectIds);

  // Teachers upload; only Counselor/Admin/Super Admin approve or reject.
  const canUpload = ACADEMIC_STAFF_ROLES.includes(session.user.role);
  const canReview = KNOWLEDGE_BASE_REVIEWER_ROLES.includes(session.user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${batch.name} — Notes`}
        description="Academy-approved material the AI Study Assistant can ground answers in for this class."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/knowledge-base">Back to Classes</Link>
          </Button>
        }
      />
      <BatchKnowledgeList
        batchId={batch.id}
        academicLevelId={batch.academicLevelId}
        boardId={batch.boardId}
        groupId={batch.groupId}
        documents={documents}
        subjects={availableSubjects.map((s) => s.subject)}
        canUpload={canUpload}
        canReview={canReview}
      />
    </div>
  );
}
