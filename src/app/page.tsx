import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME_PATH } from "@/lib/permissions";

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect(ROLE_HOME_PATH[session.user.role]);
  redirect("/login");
}
