"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";

export default function StudentPortalEntryPage() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.user?.role === "STUDENT") {
          setSessionUser(data.user);
          router.replace("/student/profile");
        } else {
          setSessionUser(null);
        }
      })
      .catch(() => setSessionUser(null))
      .finally(() => setAuthChecked(true));
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <Skeleton className="h-64 w-96 rounded-3xl" />
      </div>
    );
  }

  if (sessionUser?.role === "STUDENT") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-slate-400 text-xs font-semibold">
        Redirecting to My Profile...
      </div>
    );
  }

  return <StudentLoginForm />;
}
