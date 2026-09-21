import "server-only";
import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";

function hashKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** The real key is returned exactly once, at creation — only its hash and a short display
 * prefix are ever stored, same "never store the real secret" precedent as password hashing. */
export async function createApiKey(input: { label: string; createdById: string }) {
  const rawKey = `pfa_${randomBytes(24).toString("hex")}`;
  const record = await db.apiKey.create({
    data: { label: input.label, keyHash: hashKey(rawKey), keyPrefix: rawKey.slice(0, 12), createdById: input.createdById },
  });
  return { ...record, rawKey };
}

export function listApiKeys() {
  return db.apiKey.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } });
}

export function revokeApiKey(id: string) {
  return db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}
