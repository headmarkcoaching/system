import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewMessageForm } from "@/components/shared/new-message-form";

export default async function StudentNewMessagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const teachers = student ? await teacherMessageService.listTeachersForStudent(student.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Message"
        description="Choose one of your teachers."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/messages">Back to Messages</Link>
          </Button>
        }
      />
      {!student || teachers.length === 0 ? (
        <EmptyState title="No teachers to message yet" description="Once you're in a batch with assigned teachers, you can write to them here." />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="p-5 sm:p-6">
            <NewMessageForm targets={[{ studentId: student.id, studentName: student.fullName, teachers }]} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
