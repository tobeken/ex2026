"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("participantId");
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12">
      <p className="text-sm text-muted-foreground">ログアウト中です...</p>
    </div>
  );
}
