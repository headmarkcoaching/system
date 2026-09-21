import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import * as leadService from "@/lib/services/leads";
import * as academicService from "@/lib/services/academic-structure";
import { getCounselorRecordForUser } from "@/lib/access";
import { formatDate } from "@/lib/utils";
import { LeadsBoard } from "./leads-board";

const STAGE_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ASSESSMENT_BOOKED", label: "Assessment Booked" },
  { value: "ASSESSMENT_COMPLETED", label: "Assessment Completed" },
  { value: "FREE_TRIAL", label: "Free Trial" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "LOST", label: "Lost" },
];

export default async function CounselorLeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; level?: string; page?: string; view?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const counselor = await getCounselorRecordForUser(session.user.id);
  if (!counselor) {
    return <EmptyState title="No counselor profile found" description="Ask an admin to link your account to a counselor profile." />;
  }

  const view = searchParams.view === "list" ? "list" : "board";
  const academicLevels = await academicService.listAcademicLevels();
  const levelOptions = academicLevels.map((l) => ({ value: l.id, label: l.name }));

  const viewParams = new URLSearchParams();
  if (searchParams.q) viewParams.set("q", searchParams.q);
  if (searchParams.level) viewParams.set("level", searchParams.level);
  if (searchParams.stage) viewParams.set("stage", searchParams.stage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leads"
        description="Drag a card between stages, or switch to the list to sort and page through everything."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <Button asChild variant={view === "board" ? "default" : "ghost"} size="sm" className="h-8 px-2.5">
                <Link href={`/counselor/leads?${new URLSearchParams({ ...Object.fromEntries(viewParams), view: "board" }).toString()}`}>
                  <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Board
                </Link>
              </Button>
              <Button asChild variant={view === "list" ? "default" : "ghost"} size="sm" className="h-8 px-2.5">
                <Link href={`/counselor/leads?${new URLSearchParams({ ...Object.fromEntries(viewParams), view: "list" }).toString()}`}>
                  <ListIcon className="mr-1.5 h-3.5 w-3.5" /> List
                </Link>
              </Button>
            </div>
            <Button asChild>
              <Link href="/leads/new">
                <Plus className="mr-1.5 h-4 w-4" /> Add Lead
              </Link>
            </Button>
          </div>
        }
      />

      <FilterBar searchPlaceholder="Search by student, parent or phone…" defaultQuery={searchParams.q}>
        <FilterSelect paramKey="level" placeholder="All Classes" defaultValue={searchParams.level} options={levelOptions} />
        {view === "list" && <FilterSelect paramKey="stage" placeholder="All Stages" defaultValue={searchParams.stage} options={STAGE_OPTIONS} />}
      </FilterBar>

      {view === "board" ? (
        <BoardView counselorId={counselor.id} q={searchParams.q} academicLevelId={searchParams.level} />
      ) : (
        <ListView counselorId={counselor.id} q={searchParams.q} stage={searchParams.stage} academicLevelId={searchParams.level} page={searchParams.page} searchParams={searchParams} />
      )}
    </div>
  );
}

async function BoardView({ counselorId, q, academicLevelId }: { counselorId: string; q?: string; academicLevelId?: string }) {
  const leads = await leadService.listLeadsForBoard({ counselorId, q, academicLevelId });
  return <LeadsBoard leads={leads} />;
}

async function ListView({
  counselorId,
  q,
  stage,
  academicLevelId,
  page,
  searchParams,
}: {
  counselorId: string;
  q?: string;
  stage?: string;
  academicLevelId?: string;
  page?: string;
  searchParams: Record<string, string | undefined>;
}) {
  const { items, total, page: currentPage, pageSize, totalPages } = await leadService.listLeads({
    page: Number(page ?? 1),
    q,
    stage,
    academicLevelId,
    counselorId,
  });

  const columns: DataTableColumn<(typeof items)[number]>[] = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.studentName}</p>
          <p className="text-xs text-muted-foreground">{r.parentName} · {r.parentPhone}</p>
        </div>
      ),
    },
    { key: "level", header: "Level", cell: (r) => r.academicLevel?.name ?? "—" },
    { key: "source", header: "Source", cell: (r) => <StatusBadge status={r.source} /> },
    { key: "followup", header: "Next Follow-up", cell: (r) => (r.followups[0] ? formatDate(r.followups[0].dueDate) : "—") },
    { key: "stage", header: "Stage", cell: (r) => <StatusBadge status={r.stage} /> },
  ];

  return (
    <>
      <DataTable columns={columns} data={items} rowKey={(r) => r.id} rowHref={(r) => `/leads/${r.id}`} emptyTitle="No leads assigned yet" />
      <Pagination page={currentPage} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/counselor/leads" searchParams={searchParams} />
    </>
  );
}
