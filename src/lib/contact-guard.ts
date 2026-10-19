import "server-only";
import { findSharedContact, CONTACT_BLOCK_MESSAGE } from "@/lib/contact-filter";
import { logAudit } from "@/lib/audit";

/** What a signed-in person is doing when the text is checked; used only to record a refusal. */
interface Actor {
  id: string;
  role: string;
}

/** Roles that may share contact details: the office speaks for the academy. */
const EXEMPT_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "COUNSELOR"]);

/**
 * Checks every piece of free text a student, parent or teacher is about to send to another of them.
 * Returns the message to show if the text is refused, otherwise null. A refusal is written to the audit
 * log (with the start of the text) so the admins can see who keeps trying and where.
 */
export async function guardContactDetails(actor: Actor, channel: string, ...texts: (string | null | undefined)[]): Promise<string | null> {
  if (EXEMPT_ROLES.has(actor.role)) return null;
  for (const text of texts) {
    if (!text) continue;
    const kind = findSharedContact(text);
    if (kind) {
      await logAudit({
        actorId: actor.id,
        action: "CREATE",
        entityType: "ContactShareBlocked",
        after: { channel, kind, role: actor.role, text: text.slice(0, 240) },
      });
      return CONTACT_BLOCK_MESSAGE;
    }
  }
  return null;
}
