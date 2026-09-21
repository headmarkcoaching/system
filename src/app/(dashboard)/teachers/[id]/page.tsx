import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as analyticsService from "@/lib/services/analytics";
import { STAFF_ROLES } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PhotoUploadAvatar } from "@/components/shared/photo-upload-avatar";
import { initials } from "@/lib/utils";
import { Video, CalendarCheck, ClipboardCheck, MessageSquare, Sparkles, GraduationCap, BriefcaseBusiness, BookMarked } from "lucide-react";
import { EditTeacherProfileDialog } from "./edit-profile-dialog";
import { uploadTeacherPhotoAction } from "./actions";

export default async function TeacherProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(session.user.role);
  const isSelf = session.user.role === "TEACHER";

  const teacher = await staffService.getTeacherById(params.id);
  if (!teacher) notFound();

  const canEdit = isStaff || (isSelf && teacher.userId === session.user.id);
  if (!canEdit) {
    redirect("/teacher");
  }

  const analytics = await analyticsService.teacherAnalytics(teacher.id);
  const hasQualifications = teacher.qualification || teacher.experienceYears != null || teacher.specialization;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PhotoUploadAvatar
            photoUrl={teacher.photoUrl}
            fallbackText={initials(teacher.fullName)}
            size="h-16 w-16"
            editable={canEdit}
            onUpload={uploadTeacherPhotoAction.bind(null, teacher.id)}
          />
          <div>
            <h1 className="text-xl font-bold">{teacher.fullName}</h1>
            <p className="text-sm text-muted-foreground">{teacher.email ?? teacher.phone ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <EditTeacherProfileDialog
              teacherId={teacher.id}
              qualification={teacher.qualification}
              experienceYears={teacher.experienceYears}
              specialization={teacher.specialization}
              bio={teacher.bio}
            />
          )}
          {isStaff && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/teachers">Back to Teachers</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Qualifications</h3>
        {hasQualifications ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Qualification</p>
                <p className="text-sm font-medium">{teacher.qualification ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="text-sm font-medium">{teacher.experienceYears != null ? `${teacher.experienceYears} years` : "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Specialization</p>
                <p className="text-sm font-medium">{teacher.specialization ?? "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No qualifications on file yet" description={canEdit ? "Use Edit Profile to add them." : undefined} className="py-6" />
        )}
      </div>

      {teacher.bio && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-1 font-semibold">Bio</h3>
          <p className="text-sm text-muted-foreground">{teacher.bio}</p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <h3 className="font-semibold">Performance</h3>
          <p className="text-xs text-muted-foreground">Derived from their classes and students — for operational quality monitoring, not a scorecard.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Classes Conducted" value={analytics.classesConducted} icon={Video} />
          <StatCard label="Avg. Student Attendance" value={`${analytics.avgAttendance}%`} icon={CalendarCheck} />
          <StatCard label="Homework Review Rate" value={`${analytics.homeworkReviewRate}%`} icon={ClipboardCheck} />
          <StatCard label="Feedback Completion" value={`${analytics.feedbackCompletionRate}%`} icon={MessageSquare} />
          <StatCard label="Avg. Student Performance" value={analytics.avgStudentPerformance} icon={Sparkles} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Assigned Batches</h3>
        {teacher.batchAssignments.length === 0 ? (
          <EmptyState title="No batches assigned yet" className="py-6" />
        ) : (
          <ul className="space-y-2">
            {teacher.batchAssignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <Link href={`/batches/${a.batchId}`} className="font-medium hover:underline">
                  {a.batch.name}
                </Link>
                {a.subject && <Badge variant="outline">{a.subject.name}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
