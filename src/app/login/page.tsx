"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";

export default function LegacyLoginPage() {
  useEffect(() => {
    window.location.href = "/admin";
  }, []);

  return null;
}
