import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME_PATH } from "@/lib/permissions";

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect(ROLE_HOME_PATH[session.user.role]);
  // Visitors see the public website; students, parents and teachers sign in through its Login links or
  // straight at /login (which is also where the installed app opens).
  redirect("/home");
}
