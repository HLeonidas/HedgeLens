import { redirect } from "next/navigation";

import { requireActiveUser } from "@/lib/users";
import { AppShell } from "@/components/layout/AppShell";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const gate = await requireActiveUser();

  if (gate.status === "unauthenticated" || gate.status === "missing") {
    redirect("/signin");
  }

  if (gate.status === "inactive") {
    redirect("/inactive");
  }

  return <AppShell user={gate.user}>{children}</AppShell>;
}
