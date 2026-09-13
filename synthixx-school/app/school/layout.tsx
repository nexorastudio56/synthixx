import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SchoolShell } from "@/components/school/school-shell";

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/school");

  return <SchoolShell>{children}</SchoolShell>;
}
