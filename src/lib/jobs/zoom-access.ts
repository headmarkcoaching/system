import "server-only";
import { revokeLapsedRegistrations } from "@/lib/services/zoom-participants";

/** Cancels the personal Zoom links of students whose fees have lapsed (see services/zoom-participants). */
export async function runZoomAccessCheck() {
  return revokeLapsedRegistrations();
}
