import { requireSection } from "@/lib/section-guard";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  await requireSection(["PARENT"]);
  return <>{children}</>;
}
