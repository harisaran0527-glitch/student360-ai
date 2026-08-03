import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin");
  }

  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/student");
  }
}
