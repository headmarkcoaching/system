import { requireSection } from "@/lib/section-guard";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireSection(["STUDENT"]);
  return <>{children}</>;
}
