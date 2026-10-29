import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Flag, Timer } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import { requireViewer, studentProfile } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { alertsFor, loadAnalytics } from "@/lib/data/analytics";
import { dailySummary } from "@/lib/data/summary";
import { phaseForDay } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";
import { CopySummary } from "./copy-summary";

export default async function MentorHome() {
  const [viewer, student, settings, db] = await Promise.all([requireViewer("mentor"), studentProfile(), loadSettings(), supabaseServer()]);
  if (!student) {
    return <PageHeader title="No student account yet" kicker="Mentor">Create it from the setup page.</PageHeader>;
  }
  // Counts don't depend on the analytics, so fetch them at the same time.
  const countsP = Promise.all([
    db.from("studio_submissions").select("*", { count: "exact", head: true }).is("reviewed_at", null).neq("context", "mock"),
    db.from("mock_attempts").select("answers").not("submitted_at", "is", null),
    db.from("item_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    db.from("items").select("*", { count: "exact", head: true }).eq("needs_review", true).eq("status", "live"),
  ]);
  const a = await loadAnalytics(db, student.id, settings);
  const alerts = alertsFor(a);
  const [summary, [{ count: toReview }, { data: mocks }, { count: reports }, { count: needsReview }]] = await Promise.all([
    dailySummary(db, student.id, student.displayName, a, alerts),
    countsP,
  ]);
  const phase = phaseForDay(a.todayNo, settings.phases);
  const mocksToMark = (mocks ?? []).filter((m) => !Object.keys(((m.answers as { mentorMarks?: object }).mentorMarks) ?? {}).length).length;

  return (
    <div className="space-y-5">
      <PageHeader title={`${student.displayName}'s progress`} kicker={`Mentor · ${viewer.displayName}`}>
        {a.todayNo >= 1 ? `Day ${a.todayNo} of ${settings.phases.totalDays}${phase ? ` · ${phase.id} ${phase.name}` : ""}` : `Day 1 starts in ${1 - a.todayNo} days`}
      </PageHeader>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((x) => (
            <p key={x.text} role="alert" className={`flex items-center gap-2 rounded-xl p-3 text-sm ${x.level === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> {x.text}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/admin/review" className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-3">
          <p className="flex items-center gap-1 text-xs text-ink-2"><ClipboardCheck className="size-3.5" aria-hidden />Sheets to review</p>
          <p className="font-serif text-3xl">{toReview ?? 0}</p>
        </Link>
        <Link href="/admin/mocks" className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-3">
          <p className="flex items-center gap-1 text-xs text-ink-2"><Timer className="size-3.5" aria-hidden />Mocks to mark</p>
          <p className="font-serif text-3xl">{mocksToMark}</p>
        </Link>
        <Link href="/admin/content?tab=reports" className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-3">
          <p className="flex items-center gap-1 text-xs text-ink-2"><Flag className="size-3.5" aria-hidden />Question reports</p>
          <p className="font-serif text-3xl">{reports ?? 0}</p>
        </Link>
        <Link href="/admin/content?tab=review" className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-3">
          <p className="text-xs text-ink-2">Facts to verify</p>
          <p className="font-serif text-3xl">{needsReview ?? 0}</p>
        </Link>
      </div>

      <Card>
        <CardLabel className="mb-2">Today&apos;s summary (send at 9 pm)</CardLabel>
        <CopySummary text={summary} />
      </Card>

      {a.wellbeing.length > 0 && (
        <Card>
          <CardLabel className="mb-2">Wellbeing (last {a.wellbeing.length} reflections)</CardLabel>
          <div className="flex gap-2 overflow-x-auto text-center text-xs">
            {a.wellbeing.map((w) => (
              <div key={w.day} className="min-w-12 rounded-lg bg-surface-2 p-2">
                <p className="text-ink-3">D{w.day}</p>
                <p className="text-lg">{["", "😞", "😕", "😐", "🙂", "😄"][w.mood ?? 0]}</p>
                <p className={w.sleep !== null && w.sleep < 6 ? "font-medium text-bad" : ""}>{w.sleep ?? "–"}h</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ProgressView a={a} student={false} />
    </div>
  );
}
