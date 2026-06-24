"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the Server Component data fetch on an interval (live updates without client→VPS calls).
 * Pauses when the tab is hidden.
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
