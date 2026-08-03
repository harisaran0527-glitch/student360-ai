"use client";

import { useEffect } from "react";

export default function StudentDashboardAliasPage() {
  useEffect(() => {
    window.location.href = "/student";
  }, []);

  return null;
}
