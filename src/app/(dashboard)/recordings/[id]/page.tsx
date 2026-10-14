import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/session";
import { assertCanManageBatch } from "@/lib/access";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProtectedVideo } from "@/components/shared/protected-video";

// How staff (admins and the batch's teachers) watch a stored lecture. Students never come here:
// they watch from their own Recordings page, inside their 48 hours.
export default async function StaffRecordingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getVerifiedSession();
  if (!session?.user) redirect("/signed-out");
  if (!ACADEMIC_STAFF_ROLES.includes(session.user.role)) redirect("/");

  const recording = await db.classRecording.findUnique({ where: { id }, include: { subject: true, batch: true } });
  if (!recording || !recording.driveFileId) notFound();
  try {
    await assertCanManageBatch(session, recording.batchId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title={recording.title}
        description={`${recording.subject.name} · ${recording.batch.name} · ${formatDate(recording.recordingDate)}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/batches/${recording.batchId}`}>Back to batch</Link>
          </Button>
        }
      />
      <ProtectedVideo src={`/api/recordings/${recording.id}/stream`} watermark={session.user.name ?? "Head Mark staff"} />
    </div>
  );
}
