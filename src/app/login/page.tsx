import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyLoginPage() {
  redirect("/admin");
}
