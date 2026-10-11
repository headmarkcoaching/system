import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { ThreadTable } from "@/components/shared/thread-table";

export default async function TeacherMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacher = await staffService.getTeacherByUserId(session.user.id);
  const threads = teacher ? await teacherMessageService.listThreadsForTeacher(teacher.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Private messages from parents and students. The academy office can read these conversations."
      />
      <ThreadTable threads={threads} side="teacher" myUserId={session.user.id} emptyTitle="No messages yet" />
    </div>
  );
}
