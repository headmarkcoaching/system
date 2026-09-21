import { redirect } from "next/navigation";

// Merged into the "Academy Health Overview" section of the main Dashboard — kept as a
// redirect (not deleted outright) so any old bookmark or link still lands somewhere real.
export default function CommandCenterPage() {
  redirect("/admin");
}
