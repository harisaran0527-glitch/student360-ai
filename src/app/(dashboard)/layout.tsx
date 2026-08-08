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

  return (
    <DashboardLayoutClient
      userRole={session?.role || "ADMIN"}
      userName={session?.fullName || "Priyadharshini"}
      userEmail={session?.email || "admin@student360.ai"}
    >
      {children}
    </DashboardLayoutClient>
  );
}
