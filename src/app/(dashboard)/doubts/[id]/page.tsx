import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/permissions";
import { getDoubtAccess } from "@/lib/communication-access";
import { isOverdue } from "@/lib/services/doubts";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversationItem } from "@/components/shared/conversation";
import { DoubtThread } from "./doubt-thread";

const BACK: Record<string, { href: string; label: string }> = {
  student: { href: "/student/doubts", label: "Back to My Doubts" },
  teacher: { href: "/teacher/doubts", label: "Back to Doubts" },
  admin: { href: "/admin/doubts", label: "Back to Doubts" },
};

export default async function DoubtPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let access;
  try {
    access = await getDoubtAccess(session, params.id);
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }
  const { doubt, viewer } = access;
  const back = BACK[viewer];

  // The question itself is the first message in the thread, followed by every reply in order.
  const items: ConversationItem[] = [
    {
      id: doubt.id,
      authorId: doubt.student.userId ?? doubt.student.id,
      authorName: doubt.student.fullName,
      body: doubt.body,
      createdAt: doubt.createdAt,
      attachment: doubt.attachmentFile,
    },
    ...doubt.replies.map((r) => ({
      id: r.id,
      authorId: r.author.id,
      authorName: r.author.name,
      body: r.body,
      createdAt: r.createdAt,
      attachment: r.attachmentFile,
    })),
  ];

  const overdue = isOverdue(doubt);

  return (
    <div className="space-y-6">
      <PageHeader
        title={doubt.title}
        description={[doubt.subject.name, doubt.chapter, doubt.batch.name, viewer !== "student" ? `Asked by ${doubt.student.fullName}` : null].filter(Boolean).join(" · ")}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={back.href}>{back.label}</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={doubt.status} />
            {overdue && <Badge variant="destructive">Waiting over 24 hours</Badge>}
          </div>
          <DoubtThread doubtId={doubt.id} status={doubt.status} items={items} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
