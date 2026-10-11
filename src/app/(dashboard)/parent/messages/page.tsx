import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { ThreadTable } from "@/components/shared/thread-table";
import { Button } from "@/components/ui/button";

export default async function ParentMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const threads = await teacherMessageService.listThreadsForStarter(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message a Teacher"
        description="Write to your child's teacher about their progress. For fees, accounts or anything for the office, raise a support ticket instead."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/support">Support</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/parent/messages/new">
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
