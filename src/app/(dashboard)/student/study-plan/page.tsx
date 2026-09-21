import { redirect } from "next/navigation";

// AI access is deliberately disabled for students — product decision, not a gap. Redirect
// rather than 404 so a bookmarked/typed link (or the old Next Actions "Revise a weak chapter"
// link, now repointed to /student/exam-prep) just lands somewhere useful.
export default async function StudyPlanPage() {
  redirect("/student");
}
