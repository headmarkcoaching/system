"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityDialog, type FieldDef, type FieldValue } from "@/components/shared/entity-dialog";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Sparkles, Trophy, Plus, ShieldAlert } from "lucide-react";
import {
  recalculateEngagementAction,
  createInterventionAction,
  updateInterventionStatusAction,
  recalculateRiskAction,
  suggestInterventionPlanAction,
} from "./engagement-actions";

interface EngagementScore {
  score: number;
  status: string;
  attendanceComponent: number;
  homeworkComponent: number;
  loginComponent: number;
  testComponent: number;
  participationComponent: number;
  calculatedAt: Date;
}
interface PointEntry {
  id: string;
  points: number;
  reason: string | null;
  awardedAt: Date;
}
interface BadgeEntry {
  id: string;
  awardedAt: Date;
  badge: { id: string; name: string; description: string | null };
}
interface InterventionEntry {
  id: string;
  reason: string;
  actionPlan: string;
  status: string;
  startDate: Date;
  reviewDate: Date;
  responsibleStaff: { name: string };
}
interface StaffOption {
  id: string;
  name: string;
}
interface RiskScore {
  score: number;
  riskLevel: string;
  signals: string[];
  calculatedAt: Date;
}

export function EngagementTab({
  studentId,
  latestScore,
  pointsTotal,
  pointsHistory,
  badges,
  interventions,
  staffOptions,
  latestRisk,
  canManage,
}: {
  studentId: string;
  latestScore: EngagementScore | null;
  pointsTotal: number;
  pointsHistory: PointEntry[];
  badges: BadgeEntry[];
  interventions: InterventionEntry[];
  staffOptions: StaffOption[];
  latestRisk: RiskScore | null;
  canManage: boolean;
}) {
  const [recalculating, setRecalculating] = React.useState(false);
  const [risk, setRisk] = React.useState(latestRisk);
  const [recalculatingRisk, setRecalculatingRisk] = React.useState(false);
  const [suggesting, setSuggesting] = React.useState(false);
  const [aiDraft, setAiDraft] = React.useState<Record<string, FieldValue> | undefined>(undefined);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await recalculateEngagementAction(studentId);
      toast.success("Engagement score recalculated");
    } catch {
      toast.error("Could not recalculate.");
    } finally {
      setRecalculating(false);
    }
  }

  async function handleRecalculateRisk() {
    setRecalculatingRisk(true);
    try {
      const record = await recalculateRiskAction(studentId);
      setRisk({ score: record.score, riskLevel: record.riskLevel, signals: record.signals as string[], calculatedAt: record.calculatedAt });
      toast.success("Predictive risk score recalculated");
    } catch {
      toast.error("Could not recalculate.");
    } finally {
      setRecalculatingRisk(false);
    }
  }

  async function handleSuggestIntervention() {
    setSuggesting(true);
    try {
      const draft = await suggestInterventionPlanAction(studentId);
      setAiDraft({ reason: draft.reason, actionPlan: draft.actionPlan });
      toast.success('Draft ready — click "Create Intervention" to review and save it.');
    } catch {
      toast.error("Couldn't draft a suggestion. Please try again.");
    } finally {
      setSuggesting(false);
    }
  }

  const interventionFields: FieldDef[] = [
    { type: "textarea", name: "reason", label: "Reason", required: true },
    { type: "textarea", name: "actionPlan", label: "Action Plan", required: true },
    { type: "select", name: "responsibleStaffId", label: "Responsible Staff", required: true, options: staffOptions.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "startDate", label: "Start Date (YYYY-MM-DD)", required: true, placeholder: "2026-09-05" },
    { type: "text", name: "reviewDate", label: "Review Date (YYYY-MM-DD)", required: true, placeholder: "2026-09-19" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Engagement Score</CardTitle>
          {canManage && (
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} /> Recalculate
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!latestScore ? (
            <EmptyState title="Not calculated yet" className="py-6" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{latestScore.score}</span>
                <StatusBadge status={latestScore.status} />
                <span className="text-xs text-muted-foreground">as of {formatDate(latestScore.calculatedAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                <span>Attendance: {Math.round(latestScore.attendanceComponent)}</span>
                <span>Homework: {Math.round(latestScore.homeworkComponent)}</span>
                <span>Login: {Math.round(latestScore.loginComponent)}</span>
                <span>Tests: {Math.round(latestScore.testComponent)}</span>
                <span>Participation: {Math.round(latestScore.participationComponent)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Points & Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{pointsTotal}</span>
            <span className="text-sm text-muted-foreground">total points</span>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <Badge key={b.id} variant="success" className="gap-1">
                  <Trophy className="h-3 w-3" /> {b.badge.name}
                </Badge>
              ))}
            </div>
          )}
          {pointsHistory.length === 0 ? (
            <EmptyState title="No points earned yet" className="py-4" />
          ) : (
            <ul className="space-y-1 text-sm">
              {pointsHistory.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{p.reason ?? "Points awarded"}</span>
                  <span className="font-medium text-success">+{p.points}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-primary" /> Predictive Risk Score
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleRecalculateRisk} disabled={recalculatingRisk}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${recalculatingRisk ? "animate-spin" : ""}`} /> Recalculate
            </Button>
          </CardHeader>
          <CardContent>
            {!risk ? (
              <EmptyState title="Not calculated yet" description="A transparent, rule-based reading of declining trends — not shown to the student." className="py-6" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{risk.score}</span>
                  <StatusBadge status={risk.riskLevel} />
                  <span className="text-xs text-muted-foreground">as of {formatDate(risk.calculatedAt)}</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {risk.signals.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Interventions</CardTitle>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSuggestIntervention} disabled={suggesting}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {suggesting ? "Drafting…" : "Suggest with AI"}
              </Button>
              <EntityDialog
                trigger={
                  <Button size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Intervention
                  </Button>
                }
                title="Create Intervention"
                fields={interventionFields}
                defaultValues={aiDraft}
                onSubmit={(data) => createInterventionAction(studentId, data)}
                onSuccess={() => setAiDraft(undefined)}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <EmptyState title="No interventions yet" className="py-6" />
          ) : (
            <ul className="space-y-2">
              {interventions.map((i) => (
                <li key={i.id} className="space-y-1 rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{i.reason}</span>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="text-muted-foreground">{i.actionPlan}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.responsibleStaff.name} · {formatDate(i.startDate)} → review {formatDate(i.reviewDate)}
                  </p>
                  {canManage && i.status !== "COMPLETED" && i.status !== "CANCELLED" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => updateInterventionStatusAction(i.id, "IN_PROGRESS", studentId)}>
                        In Progress
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateInterventionStatusAction(i.id, "COMPLETED", studentId)}>
                        Complete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
