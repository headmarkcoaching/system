import { PageHeader } from "@/components/shared/page-header";
import { FilterSelect } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { WeeklyTimetableGrid } from "@/components/shared/weekly-timetable-grid";
import * as batchService from "@/lib/services/batches";

export default async function TimetablePage({ searchParams }: { searchParams: { batch?: string } }) {
  const [entries, batches] = await Promise.all([
    batchService.listTimetable({ batchId: searchParams.batch }),
    batchService.listBatchesForPicker(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Master Timetable" description="All scheduled classes across every batch. Add entries from a batch's Schedule tab." />

      <FilterSelect paramKey="batch" placeholder="All Batches" defaultValue={searchParams.batch} options={batches.map((b) => ({ value: b.id, label: b.name }))} />

      {entries.length === 0 ? (
        <EmptyState title="No timetable entries yet" description="Add entries from a batch's Schedule tab." />
      ) : (
        <WeeklyTimetableGrid
          entries={entries.map((e) => ({
            id: e.id,
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            subjectId: e.subjectId,
            title: `${e.subject.name} — ${e.batch.name}`,
            subtitle: e.teacher.fullName,
            href: `/batches/${e.batchId}`,
          }))}
        />
      )}
    </div>
  );
}
