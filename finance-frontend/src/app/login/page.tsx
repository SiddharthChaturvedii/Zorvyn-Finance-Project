"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * ZORVYN AUTH REDIRECT
 * This component bridges the architectural shift from /login to the root auth portal.
 * It prevents 404 errors for legacy bookmarks or manual navigation.
 */
export default function LoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Perform an immediate, lower-level replace to keep the history clean
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center font-mono text-[10px] text-text-dim/40 uppercase tracking-widest">
      Redirecting to secure gateway...
    </div>
  );
}
