"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dismissReport } from "./actions";

export function DismissButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <Button variant="ghost" disabled={pending} onClick={() => start(() => dismissReport(id))}>Dismiss</Button>;
}
