import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">{children}</main>;
  }

  return (
    <DashboardLayoutClient
      userRole={session.role}
      userName={session.fullName}
      userEmail={session.email}
    >
      {children}
    </DashboardLayoutClient>
  );
}
