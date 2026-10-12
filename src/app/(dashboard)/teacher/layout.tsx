import { requireSection } from "@/lib/section-guard";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireSection(["TEACHER"]);
  return <>{children}</>;
}
