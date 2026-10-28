"use client";
import { useEffect } from "react";
import { markResultSeen } from "@/app/(student)/actions";

/** Marks the "Result & explanations" step done when the page is opened. */
export function MarkSeen({ planId }: { planId: string }) {
  useEffect(() => {
    void markResultSeen(planId);
  }, [planId]);
  return null;
}
