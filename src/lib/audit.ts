import "server-only";
import { db } from "@/lib/db";

export async function logAudit({
  actorId,
  action,
  entityType,
  entityId,
  before,
  after,
}: {
  actorId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "STATUS_CHANGE";
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        before: before === undefined ? undefined : (before as object),
        after: after === undefined ? undefined : (after as object),
      },
    });
  } catch (error) {
    // Audit logging is best-effort: a failure here (e.g. a stale session
    // referencing a since-recreated user) must never block the primary action.
    console.error("logAudit failed", error);
  }
}
