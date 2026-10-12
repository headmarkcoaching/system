import { requireSection } from "@/lib/section-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSection(["SUPER_ADMIN", "ADMIN"]);
  return <>{children}</>;
}
