"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboardAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/profile");
  }, [router]);

  return null;
}
