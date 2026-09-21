import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as parentService from "@/lib/services/parents";
import * as notesSubscriptionsService from "@/lib/services/notes-subscriptions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ChildSwitcher } from "../child-switcher";
import { NotesSubscriptionView } from "./notes-subscription-view";

export default async function NotesSubscriptionPage({ searchParams }: { searchParams: { child?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PARENT") redirect("/");

  const parent = await parentService.getChildrenForParentUser(session.user.id);
  if (!parent || parent.children.length === 0) {
    return <EmptyState title="No children linked to your account yet" description="Contact the academy to link your child's profile." />;
  }

  const selected = parent.children.find((c) => c.studentId === searchParams.child) ?? parent.children[0];
  const student = selected.student;

  const [subjects, subscriptions] = await Promise.all([
    notesSubscriptionsService.listSubscribableSubjectsForStudent(student.id),
    notesSubscriptionsService.listSubscriptionsForStudent(student.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes by Post"
        description={`Subscribe to have ${student.academicLevel.name} notes printed and mailed to your address every month — Rs ${notesSubscriptionsService.NOTES_PRICE_PER_MONTH}/subject/month.`}
        actions={<ChildSwitcher options={parent.children.map((c) => ({ id: c.studentId, fullName: c.student.fullName }))} selectedId={student.id} />}
      />
      {subjects.length === 0 ? (
        <EmptyState title="No subjects found for this student yet" description="Notes-by-post becomes available once the student is placed in a batch with subjects assigned." />
      ) : (
        <NotesSubscriptionView
          studentId={student.id}
          studentName={student.fullName}
          parentPhone={parent.phone}
          subjects={subjects}
          subscriptions={subscriptions.map((s) => ({
            id: s.id,
            subjectId: s.subjectId,
            subjectName: s.subject.name,
            status: s.status,
            deliveryName: s.deliveryName,
            deliveryAddress: s.deliveryAddress,
            deliveryCity: s.deliveryCity,
            deliveryPhone: s.deliveryPhone,
            currentMonthPayment: s.payments.find((p) => p.monthLabel === notesSubscriptionsService.currentMonthLabel())
              ? {
                  status: s.payments.find((p) => p.monthLabel === notesSubscriptionsService.currentMonthLabel())!.status,
                  shippedAt: s.payments.find((p) => p.monthLabel === notesSubscriptionsService.currentMonthLabel())!.shippedAt,
                }
              : null,
          }))}
        />
      )}
    </div>
  );
}
