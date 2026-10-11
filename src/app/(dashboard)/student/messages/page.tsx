import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { ThreadTable } from "@/components/shared/thread-table";
import { Button } from "@/components/ui/button";

export default async function StudentMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const threads = await teacherMessageService.listThreadsForStarter(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message a Teacher"
        description="Write privately to one of your teachers. For a question about a lesson, use Ask a Doubt so the right teacher answers it."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/student/doubts">Ask a Doubt</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/student/messages/new">
                <Plus className="mr-1.5 h-4 w-4" /> New Message
              </Link>
            </Button>
          </div>
        }
      />
      <ThreadTable threads={threads} side="family" myUserId={session.user.id} emptyTitle="No messages yet" />
    </div>
  );
}
