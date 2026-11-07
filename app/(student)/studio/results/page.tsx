import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Hourglass, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardLabel } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { loadDrawingRecord } from "@/lib/data/drawings";
import { dayNumberFor, istDateString } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";

/** Drawing results, kept apart from the question tests: what's left to draw, what GB is marking, what's marked. */
export default async function DrawingResults() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { phases } = await loadSettings();
  const todayNo = dayNumberFor(istDateString(new Date()), phases.startDate);
  const r = await loadDrawingRecord(db, viewer.id, todayNo);
  const fmtDay = (ymd: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${ymd}T12:00:00+05:30`));
  const fmtWhen = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

  return (
    <div className="space-y-6">
      <PageHeader title="Drawing results" kicker="Studio" back={{ href: "/studio", label: "Studio" }}>
        Your drawing work, tracked separately from the question tests. Finish tasks any time; GB&apos;s marks appear here.
      </PageHeader>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <CardLabel>Done</CardLabel>
          <p className="font-serif text-3xl tabular-nums">{r.done}<span className="text-base text-ink-3">/{r.assigned}</span></p>
          <p className="text-xs text-ink-3">assigned tasks</p>
        </Card>
        <Card className="p-4">
          <CardLabel>Marked</CardLabel>
          <p className="font-serif text-3xl tabular-nums">{r.marked.length}</p>
          <p className="text-xs text-ink-3">{r.waiting.length} waiting</p>
        </Card>
        <Card className="p-4">
          <CardLabel>GB&apos;s average</CardLabel>
          <p className="font-serif text-3xl tabular-nums">{r.averageScore ?? "–"}{r.averageScore !== null && <span className="text-base text-ink-3">%</span>}</p>
          <p className="text-xs text-ink-3">{r.recentScores.length ? `last: ${r.recentScores.slice(-3).join("%, ")}%` : "no marks yet"}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><PenTool className="size-5 text-accent" aria-hidden />To draw ({r.pending.length})</h2>
        {r.pending.length ? (
          r.pending.map((p) => (
            <Card key={`${p.dayNo}:${p.taskId}`} className="p-0">
              <Link href={p.href} className="flex items-center gap-3 p-4">
                <span className="flex-1">
                  <span className="block font-medium">{p.title}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-3">
                    <Clock className="size-3" aria-hidden /> {p.minutes} min · Day {p.dayNo} · {fmtDay(p.date)} · {p.kind === "test" ? "test drawing" : "daily challenge"}
                  </span>
                </span>
                <span className="text-sm font-medium text-accent">Draw now</span>
                <ChevronRight className="size-4 text-accent" aria-hidden />
              </Link>
            </Card>
          ))
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-good-soft p-4 text-sm font-medium text-good"><CheckCircle2 className="size-5" aria-hidden />Nothing left to draw. Well done!</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><Hourglass className="size-5 text-warn" aria-hidden />Waiting for GB&apos;s marks ({r.waiting.length})</h2>
        {r.waiting.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {r.waiting.map((s) => (
              <li key={s.id}>
                <Link href={`/studio/submission/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-ink-3">Submitted {fmtWhen(s.createdAt)}{s.dayNo ? ` · Day ${s.dayNo}` : ""}</span>
                  </span>
                  <Badge tone="warn">Waiting</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Nothing waiting.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><CheckCircle2 className="size-5 text-good" aria-hidden />Marked by GB ({r.marked.length})</h2>
        {r.marked.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {r.marked.map((s) => (
              <li key={s.id}>
                <Link href={`/studio/submission/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-ink-3">{fmtWhen(s.createdAt)}{s.category ? ` · ${s.category}` : ""} · tap for GB&apos;s feedback</span>
                  </span>
                  <Badge tone={s.score! >= 60 ? "good" : s.score! >= 40 ? "warn" : "bad"}>{s.score}%</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No marks yet">When GB marks a drawing, its score and feedback appear here.</Empty>
        )}
      </section>
    </div>
  );
}
