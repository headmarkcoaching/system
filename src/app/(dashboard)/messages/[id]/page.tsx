import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { getThreadAccess } from "@/lib/communication-access";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversationItem } from "@/components/shared/conversation";
import { MessageThread } from "./message-thread";

export default async function MessageThreadPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  let viewer;
  try {
    ({ viewer } = await getThreadAccess(session, params.id));
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }

  const thread = await teacherMessageService.getThread(params.id);
  if (!thread) notFound();

  const backHref =
    viewer === "admin" ? "/admin/doubts" : viewer === "teacher" ? "/teacher/messages" : session.user.role === "PARENT" ? "/parent/messages" : "/student/messages";

  const items: ConversationItem[] = thread.messages.map((m) => ({
    id: m.id,
    authorId: m.author.id,
    authorName: m.author.name,
    body: m.body,
    createdAt: m.createdAt,
    attachment: m.attachmentFile,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={thread.subject}
        description={`${thread.teacher.fullName} · about ${thread.student.fullName}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>Back</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5 sm:p-6">
          <MessageThread threadId={thread.id} items={items} currentUserId={session.user.id} canReply={viewer !== "admin"} markRead={viewer !== "admin"} />
        </CardContent>
      </Card>
    </div>
  );
}
