import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { dayNumberFor, istDateString } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";
import { refreshDay } from "./day";
import { ensurePlan } from "./plan";

/** Load a day the student is allowed to open (today or earlier), creating its plan if needed. */
export async function openDay(nParam: string) {
  const n = Number(nParam);
  if (!Number.isInteger(n)) notFound();
  const viewer = await requireViewer("student");
  const settings = await loadSettings();
  const todayNo = dayNumberFor(istDateString(new Date()), settings.phases.startDate);
  if (n < 1 || n > settings.phases.totalDays) notFound();
  if (n > todayNo) redirect("/");
  const db = await supabaseServer();
  const plan = await ensurePlan(db, viewer.id, n, settings);
  if (!plan) notFound();
  const progress = await refreshDay(db, plan, settings);
  return { viewer, settings, db, plan, progress, n, todayNo };
}
