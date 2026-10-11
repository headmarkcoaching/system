import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as parentService from "@/lib/services/parents";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewMessageForm, type MessageTarget } from "@/components/shared/new-message-form";

export default async function ParentNewMessagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parent = await parentService.getChildrenForParentUser(session.user.id);
  const targets: MessageTarget[] = [];
  for (const link of parent?.children ?? []) {
    const teachers = await teacherMessageService.listTeachersForStudent(link.student.id);
    if (teachers.length > 0) targets.push({ studentId: link.student.id, studentName: link.student.fullName, teachers });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Message"
        description="Choose your child and one of their teachers."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/parent/messages">Back to Messages</Link>
          </Button>
        }
      />
      {targets.length === 0 ? (
        <EmptyState title="No teachers to message yet" description="Once your child is placed in a batch with assigned teachers, you can write to them here." />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="p-5 sm:p-6">
            <NewMessageForm targets={targets} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
