import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ACADEMIC_STAFF_ROLES, ROLE_HOME_PATH } from "@/lib/permissions";
import * as academicService from "@/lib/services/academic-structure";
import * as bank from "@/lib/services/question-bank";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AddChapterButton,
  AddPaperButton,
  AddQuestionButton,
  AiDraftButton,
  DeleteChapterButton,
  EditChapterButton,
  EditPaperButton,
  EditQuestionButton,
  ImportQuestionsButton,
  PaperRowActions,
  QuestionStatusButtons,
  type Option,
} from "./controls";
import type { BankQuestionSource, BankQuestionStatus } from "@prisma/client";

const TABS = [
  { key: "questions", label: "Questions" },
  { key: "chapters", label: "Chapters" },
  { key: "papers", label: "Past papers" },
] as const;

const STATUSES = ["DRAFT", "APPROVED", "ARCHIVED"];
const SOURCES = ["TEACHER", "PAST_PAPER", "AI_DRAFT"];
const SOURCE_LABEL: Record<string, string> = { TEACHER: "Teacher", PAST_PAPER: "Past paper", AI_DRAFT: "AI draft" };
const TYPE_LABEL: Record<string, string> = { MCQ: "Multiple choice", NUMERICAL: "Numerical", SHORT_ANSWER: "Short answer", LONG_ANSWER: "Long answer" };

export default async function QuestionBankPage(
  props: {
    searchParams: Promise<{ tab?: string; subject?: string; chapter?: string; status?: string; source?: string; paper?: string; q?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ACADEMIC_STAFF_ROLES.includes(session.user.role)) redirect(ROLE_HOME_PATH[session.user.role]);

  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "questions";
  const [subjects, levels, boards, chapters, papers, counts] = await Promise.all([
    academicService.listSubjects(),
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    bank.listChapters(),
    bank.listPastPapers(),
    bank.getQuestionCounts(),
  ]);

  const subjectOptions: Option[] = subjects.filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.name}${s.academicLevel ? ` (${s.academicLevel.name})` : ""}` }));
  const levelOptions: Option[] = levels.filter((l) => l.isActive).map((l) => ({ value: l.id, label: l.name }));
  const boardOptions: Option[] = boards.filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }));
  const chapterOptions: Option[] = chapters.map((c) => ({ value: c.id, label: `${c.academicLevel.name} · ${c.subject.name} · Ch ${c.number}: ${c.title}` }));
  const paperOptions: Option[] = papers.map((p) => ({ value: p.id, label: `${p.year} ${p.title} · ${p.subject.name} · ${p.academicLevel.name}` }));

  const tabNav = (
    <nav role="tablist" aria-label="Question bank sections" className="flex flex-wrap gap-1.5">
      {TABS.map((t) => (
        <Link
          key={t.key}
          role="tab"
          aria-selected={tab === t.key}
          href={`/question-bank?tab=${t.key}`}
          className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors", tab === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  const header = (actions: React.ReactNode) => (
    <PageHeader
      title="Question Bank"
      description="The chapters, questions and past papers that students' practice tests are built from. Only approved questions reach students."
      actions={<div className="flex flex-wrap gap-2">{actions}</div>}
    />
  );

  // ---- Chapters ----
  if (tab === "chapters") {
    const groups = new Map<string, { title: string; subjectId: string; academicLevelId: string; rows: typeof chapters }>();
    for (const c of chapters) {
      const key = `${c.subjectId}:${c.academicLevelId}`;
      const g = groups.get(key) ?? { title: `${c.academicLevel.name} · ${c.subject.name}`, subjectId: c.subjectId, academicLevelId: c.academicLevelId, rows: [] };
      g.rows.push(c);
      groups.set(key, g);
    }
    return (
      <div className="space-y-6">
        {header(<AddChapterButton subjects={subjectOptions} levels={levelOptions} boards={boardOptions} />)}
        {tabNav}
        {groups.size === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No chapters yet. Add the chapters of a subject&apos;s book, in order, to start building practice papers.</p>
        ) : (
          Array.from(groups.values()).map((g) => (
            <section key={g.title} className="space-y-2">
              <h2 className="font-display text-lg font-semibold">
                {g.title} <span className="text-sm font-normal text-muted-foreground">({g.rows.length} chapter{g.rows.length === 1 ? "" : "s"})</span>
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {g.rows.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-8 font-ledger text-sm text-muted-foreground">{String(c.number).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.board?.name ?? "All boards"} · {c._count.questions} approved question{c._count.questions === 1 ? "" : "s"}
                      </p>
                    </div>
                    <EditChapterButton chapter={{ id: c.id, number: c.number, title: c.title, boardId: c.boardId }} subjectId={g.subjectId} academicLevelId={g.academicLevelId} boards={boardOptions} />
                    <DeleteChapterButton id={c.id} label={`chapter ${c.number}`} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    );
  }

  // ---- Past papers ----
  if (tab === "papers") {
    const columns: DataTableColumn<(typeof papers)[number]>[] = [
      {
        key: "title",
        header: "Paper",
        cell: (p) => (
          <span className="block min-w-0">
            <span className="block font-medium">{p.title}</span>
            <span className="block text-xs text-muted-foreground">
              {p.year} · {p.session.charAt(0) + p.session.slice(1).toLowerCase()} · {p.board?.name ?? "All boards"}
            </span>
          </span>
        ),
      },
      { key: "for", header: "Subject", cell: (p) => `${p.academicLevel.name} · ${p.subject.name}`, hideOnMobile: true },
      { key: "size", header: "Marks and time", cell: (p) => `${p.totalMarks} marks · ${p.durationMinutes} min`, hideOnMobile: true },
      {
        key: "content",
        header: "Content",
        cell: (p) => (
          <span className="block text-xs">
            <Link href={`/question-bank?tab=questions&paper=${p.id}`} className="text-primary hover:underline">
              {p._count.questions} approved question{p._count.questions === 1 ? "" : "s"}
            </Link>
            <span className="block text-muted-foreground">{p.file ? `PDF: ${p.file.filename}` : "No PDF attached"}</span>
          </span>
        ),
      },
      { key: "status", header: "Status", cell: (p) => <Badge variant={p.isPublished ? "success" : "secondary"}>{p.isPublished ? "Published" : "Draft"}</Badge> },
      {
        key: "actions",
        header: "",
        cell: (p) => (
          <span className="flex items-center justify-end gap-1">
            <EditPaperButton paper={{ id: p.id, boardId: p.boardId, year: p.year, session: p.session, title: p.title, totalMarks: p.totalMarks, durationMinutes: p.durationMinutes }} subjectId={p.subjectId} academicLevelId={p.academicLevelId} boards={boardOptions} />
            <PaperRowActions id={p.id} published={p.isPublished} hasFile={!!p.file} />
          </span>
        ),
      },
    ];
    return (
      <div className="space-y-6">
        {header(<AddPaperButton subjects={subjectOptions} levels={levelOptions} boards={boardOptions} />)}
        {tabNav}
        <DataTable columns={columns} data={papers} rowKey={(p) => p.id} emptyTitle="No past papers yet" emptyDescription="Add a paper, then paste its questions or attach its PDF, and publish it for students." />
      </div>
    );
  }

  // ---- Questions ----
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await bank.listQuestions({
    subjectId: searchParams.subject,
    chapterId: searchParams.chapter,
    status: STATUSES.includes(searchParams.status ?? "") ? (searchParams.status as BankQuestionStatus) : undefined,
    source: SOURCES.includes(searchParams.source ?? "") ? (searchParams.source as BankQuestionSource) : undefined,
    pastPaperId: searchParams.paper,
    q: searchParams.q?.trim() || undefined,
    page,
  });

  const columns: DataTableColumn<(typeof result.rows)[number]>[] = [
    {
      key: "question",
      header: "Question",
      cell: (r) => (
        <span className="block min-w-0 max-w-md">
          <span className="line-clamp-2 font-medium">{r.questionText}</span>
          <span className="block text-xs text-muted-foreground">
            {TYPE_LABEL[r.type]} · {r.marks} mark{r.marks === 1 ? "" : "s"} · {r.difficulty.toLowerCase()}
            {r.topic ? ` · ${r.topic}` : ""}
          </span>
        </span>
      ),
    },
    { key: "chapter", header: "Chapter", cell: (r) => `${r.academicLevel.name} · ${r.subject.name} · Ch ${r.chapter.number}`, hideOnMobile: true },
    { key: "source", header: "Source", cell: (r) => <span className="text-xs">{r.pastPaper ? r.pastPaper.title : SOURCE_LABEL[r.source]}</span>, hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <span className="flex items-center justify-end gap-0.5">
          <EditQuestionButton
            question={{
              id: r.id,
              chapterId: r.chapterId,
              type: r.type,
              questionText: r.questionText,
              options: Array.isArray(r.options) ? (r.options as string[]) : null,
              correctAnswer: r.correctAnswer,
              explanation: r.explanation,
              marks: r.marks,
              difficulty: r.difficulty,
              topic: r.topic,
              status: r.status,
              pastPaperId: r.pastPaperId,
              paperOrder: r.paperOrder,
            }}
            chapters={chapterOptions}
            papers={paperOptions}
          />
          <QuestionStatusButtons id={r.id} status={r.status} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {header(
        <>
          <AiDraftButton chapters={chapterOptions} />
          <ImportQuestionsButton chapters={chapterOptions} papers={paperOptions} />
          <AddQuestionButton chapters={chapterOptions} papers={paperOptions} />
        </>
      )}
      {tabNav}

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="success">{counts.APPROVED} approved</Badge>
        <Badge variant="warning">{counts.DRAFT} drafts to review</Badge>
        <Badge variant="outline">{counts.ARCHIVED} archived</Badge>
      </div>

      <FilterBar searchPlaceholder="Search question text…" defaultQuery={searchParams.q}>
        <FilterSelect paramKey="chapter" placeholder="Chapter" defaultValue={searchParams.chapter} options={[{ value: "", label: "All chapters" }, ...chapterOptions]} />
        <FilterSelect
          paramKey="status"
          placeholder="Status"
          defaultValue={searchParams.status}
          options={[
            { value: "", label: "Any status" },
            { value: "DRAFT", label: "Drafts" },
            { value: "APPROVED", label: "Approved" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
        />
        <FilterSelect
          paramKey="source"
          placeholder="Source"
          defaultValue={searchParams.source}
          options={[
            { value: "", label: "Any source" },
            { value: "TEACHER", label: "Teacher" },
            { value: "PAST_PAPER", label: "Past paper" },
            { value: "AI_DRAFT", label: "AI draft" },
          ]}
        />
      </FilterBar>

      <DataTable columns={columns} data={result.rows} rowKey={(r) => r.id} emptyTitle="No questions match" emptyDescription="Add a question, paste a set of them, or change the filters." />
      <Pagination page={result.page} totalPages={result.pageCount} totalItems={result.total} pageSize={result.pageSize} basePath="/question-bank" searchParams={{ tab: "questions", chapter: searchParams.chapter, status: searchParams.status, source: searchParams.source, paper: searchParams.paper, q: searchParams.q }} />
    </div>
  );
}
