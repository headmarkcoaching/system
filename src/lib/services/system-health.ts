import "server-only";
import { db } from "@/lib/db";
import * as jobRunsService from "@/lib/services/job-runs";

export interface IntegrationStatus {
  name: string;
  provider: string;
  isRealProvider: boolean;
}

function integrationStatus(): IntegrationStatus[] {
  return [
    { name: "AI", provider: process.env.AI_PROVIDER || "console", isRealProvider: (process.env.AI_PROVIDER || "console") !== "console" },
    { name: "WhatsApp", provider: process.env.WHATSAPP_PROVIDER || "console", isRealProvider: (process.env.WHATSAPP_PROVIDER || "console") !== "console" },
    { name: "Payment Gateway", provider: process.env.PAYMENT_PROVIDER || "console", isRealProvider: (process.env.PAYMENT_PROVIDER || "console") !== "console" },
    { name: "File Storage", provider: process.env.FILE_STORAGE_PROVIDER || "local", isRealProvider: (process.env.FILE_STORAGE_PROVIDER || "local") !== "local" },
  ];
}

/** Rolls up every failure signal already being logged across the app (JobRun from this phase,
 * AutomationLog from 4A, WhatsAppMessage from 4A, AIInteraction from 3A) into one page — no new
 * tracking, purely a reporting layer, same philosophy as ai-usage.ts. */
export async function getSystemHealthSummary() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentJobRuns, latestPerJob, failedJobs24h, failedAutomation24h, whatsappFailures24h, aiFailures24h, aiTotal24h] = await Promise.all([
    jobRunsService.listRecentJobRuns(30),
    jobRunsService.latestRunPerJob(),
    db.jobRun.count({ where: { status: "FAILED", startedAt: { gte: since24h } } }),
    db.automationLog.count({ where: { status: "FAILED", triggeredAt: { gte: since24h } } }),
    db.whatsAppMessage.count({ where: { status: "FAILED", createdAt: { gte: since24h } } }),
    db.aIInteraction.count({ where: { status: "FAILED", createdAt: { gte: since24h } } }),
    db.aIInteraction.count({ where: { createdAt: { gte: since24h } } }),
  ]);

  return {
    integrations: integrationStatus(),
    recentJobRuns,
    latestPerJob,
    failedJobs24h,
    failedAutomation24h,
    whatsappFailures24h,
    aiFailures24h,
    aiFailureRate24h: aiTotal24h === 0 ? 0 : Math.round((aiFailures24h / aiTotal24h) * 100),
  };
}
