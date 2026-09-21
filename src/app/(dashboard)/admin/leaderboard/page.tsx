import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import * as gamificationService from "@/lib/services/gamification";
import * as batchService from "@/lib/services/batches";
import * as academicService from "@/lib/services/academic-structure";
import { LeaderboardFilters } from "./leaderboard-filters";

export default async function LeaderboardPage({ searchParams }: { searchParams: { scope?: string; scopeId?: string } }) {
  const scope = (searchParams.scope === "batch" || searchParams.scope === "level" ? searchParams.scope : "month") as "batch" | "level" | "month";
  const [batches, levels] = await Promise.all([batchService.listBatchesForPicker(), academicService.listAcademicLevels()]);

  const effectiveScopeId = searchParams.scopeId ?? (scope === "batch" ? batches[0]?.id : scope === "level" ? levels[0]?.id : undefined);
  const rows = await gamificationService.leaderboard({ scope, scopeId: effectiveScopeId });

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    { key: "rank", header: "Rank", cell: (r) => <span className="font-bold">#{r.rank}</span> },
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.studentCode}</p>
        </div>
      ),
    },
    { key: "points", header: "Points", cell: (r) => <span className="font-semibold">{r.points}</span> },
    {
      key: "badges",
      header: "Badges",
      cell: (r) => (
        <Badge variant="secondary" className="gap-1">
          <Trophy className="h-3 w-3" /> {r.badges}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Leaderboard" description="Top students ranked by points earned from attendance, homework, tests, and participation." />

      <LeaderboardFilters scope={scope} scopeId={effectiveScopeId} batches={batches} levels={levels} />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.studentId}
        rowHref={(r) => `/students/${r.studentId}`}
        emptyTitle="No points earned yet in this scope"
        emptyDescription={scope === "batch" && batches.length > 0 ? "This batch may have its leaderboard disabled, or no points have been earned yet." : undefined}
      />
    </div>
  );
}
