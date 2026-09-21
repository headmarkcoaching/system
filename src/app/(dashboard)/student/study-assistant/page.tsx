import { redirect } from "next/navigation";

// AI access is deliberately disabled for students — product decision, not a gap. Redirect
// rather than 404 so a bookmarked/typed link just lands somewhere useful.
export default async function StudyAssistantPage() {
  redirect("/student");
}
