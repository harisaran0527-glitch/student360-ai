"use client";

import { useEffect } from "react";

export default function AdminDashboardAliasPage() {
  useEffect(() => {
    window.location.href = "/admin";
  }, []);

  return null;
}
