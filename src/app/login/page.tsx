"use client";

import { useEffect } from "react";

export default function LegacyLoginPage() {
  useEffect(() => {
    window.location.href = "/admin";
  }, []);

  return null;
}
