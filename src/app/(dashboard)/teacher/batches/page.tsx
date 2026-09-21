import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TeacherBatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teacher = await staffService.getTeacherByUserId(session.user.id);
  const batches = teacher ? await batchService.listBatchesForTeacher(teacher.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Batches" description={`${batches.length} assigned batch${batches.length === 1 ? "" : "es"}`} />

      {batches.length === 0 ? (
        <EmptyState title="No batches assigned yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <Card key={batch.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{batch.name}</CardTitle>
                  <StatusBadge status={batch.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {batch.academicLevel.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {batch._count.students} student{batch._count.students === 1 ? "" : "s"}
                  </div>
                </div>
                <Button asChild className="mt-auto">
                  <Link href={`/batches/${batch.id}`}>
                    Enter Batch <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
