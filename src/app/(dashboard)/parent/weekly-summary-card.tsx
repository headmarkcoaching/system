import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ClipboardList, Sparkles, MessageSquareQuote, ArrowRight } from "lucide-react";
import { perfTone } from "./report-item";
import { cn } from "@/lib/utils";

const TEXT_TONE_CLASSES: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/** "Simple summary first, detailed analytics optional. Do not overwhelm parents with charts."
 * One card, five plain-language lines, no charts — everything else on this dashboard (test
 * result history, parent report archive, etc.) lives behind the "Show Details" toggle below. */
export function WeeklySummaryCard({
  attendanceRate,
  homeworkRate,
  overallStatus,
  statusTone,
  teacherFeedback,
  nextSteps,
}: {
  attendanceRate: number;
  homeworkRate: number;
  overallStatus: string;
  statusTone: "success" | "warning" | "destructive" | "default";
  teacherFeedback: string | null;
  nextSteps: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <span>
            Attendance: <span className={cn("text-base font-bold", TEXT_TONE_CLASSES[perfTone(attendanceRate)])}>{attendanceRate}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span>
            Homework: <span className={cn("text-base font-bold", TEXT_TONE_CLASSES[perfTone(homeworkRate)])}>{homeworkRate}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span>
            Performance: <Badge variant={statusTone}>{overallStatus}</Badge>
          </span>
        </div>
        <div className="flex items-start gap-2">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Teacher Feedback: {teacherFeedback ? <span className="italic">&ldquo;{teacherFeedback}&rdquo;</span> : <span className="text-muted-foreground">Nothing new this week</span>}</span>
        </div>
        <div className="flex items-start gap-2">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Next Steps: {nextSteps ? <span className="font-medium">{nextSteps}</span> : <span className="text-muted-foreground">Nothing urgent right now</span>}</span>
        </div>
      </CardContent>
    </Card>
  );
}
