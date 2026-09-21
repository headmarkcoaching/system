"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { createTestAction } from "@/app/(dashboard)/tests/actions";

interface TestItem {
  id: string;
  name: string;
  status: string;
  totalMarks: number;
  startDate: Date;
  endDate: Date;
  subject: { name: string };
  results: { id: string; gradedAt: Date | null }[];
}

export function TestsTab({
  batchId,
  academicLevelId,
  tests,
  subjects,
  canManage,
}: {
  batchId: string;
  academicLevelId: string;
  tests: TestItem[];
  subjects: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Test Name", required: true, placeholder: "e.g. Chapter 3-5 Assessment" },
    { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "chapter", label: "Chapter" },
    { type: "number", name: "totalMarks", label: "Total Marks", required: true },
    { type: "number", name: "passingMarks", label: "Passing Marks", required: true },
    { type: "number", name: "durationMinutes", label: "Duration (minutes)", required: true },
    { type: "text", name: "startDate", label: "Start Date (YYYY-MM-DD)", required: true },
    { type: "text", name: "endDate", label: "End Date (YYYY-MM-DD)", required: true },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Create Test
            </Button>
          }
          title="Create Test"
          description="Add questions and open it for students from the test's own page after saving."
          fields={fields}
          defaultValues={{ academicLevelId }}
          onSubmit={(data) => createTestAction(batchId, { ...data, academicLevelId })}
          onSuccess={(result) => {
            const testId = (result as { testId?: string } | undefined)?.testId;
            if (testId) router.push(`/tests/${testId}`);
          }}
          submitLabel="Create & Manage Questions"
        />
      )}

      {tests.length === 0 ? (
        <EmptyState title="No tests created yet" />
      ) : (
        <ul className="space-y-2">
          {tests.map((t) => {
            const graded = t.results.filter((r) => r.gradedAt).length;
            return (
              <li key={t.id}>
                <a
                  href={`/tests/${t.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.subject.name} · {t.totalMarks} marks · {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{graded} graded</Badge>
                    <StatusBadge status={t.status} />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
