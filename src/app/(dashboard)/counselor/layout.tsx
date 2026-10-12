import { requireSection } from "@/lib/section-guard";

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  await requireSection(["COUNSELOR"]);
  return <>{children}</>;
}
