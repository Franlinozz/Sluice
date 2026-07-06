"use client";

import * as React from "react";

/** Honest per-browser flag for the first-run checklist: you actually opened your receipts. */
export function MarkReceiptsVisited() {
  React.useEffect(() => {
    try {
      localStorage.setItem("sluice-receipt-viewed", "1");
    } catch {}
  }, []);
  return null;
}
