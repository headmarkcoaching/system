import { redirect } from "next/navigation";

// Merged into the "Announcements" tab of the Communication Center — kept as a redirect
// (not deleted outright) so any old bookmark or link still lands somewhere real. The
// actions.ts and create-dialog.tsx in this folder are still live: createBatchAnnouncementAction
// is used by a batch's own Announcements tab, and CreateAnnouncementDialog is now imported
// directly into Communication Center.
export default function AnnouncementsPage() {
  redirect("/admin/communication");
}
