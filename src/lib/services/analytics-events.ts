import "server-only";
import { db } from "@/lib/db";

// Deliberately dependency-free (only `db`) so any service can log an event without
// risking a circular import with src/lib/services/analytics.ts, which aggregates data
// from several other services (payments, performance, ...).

export interface LogAnalyticsEventInput {
  userId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export function logAnalyticsEvent(input: LogAnalyticsEventInput) {
  return db.analyticsEvent.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as never,
    },
  });
}
