import Link from "next/link";
import { ArrowRight, Flame, Pencil, Sparkles, CalendarClock } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Countdown } from "@/components/home/countdown";
import { ContinueTests } from "@/components/home/continue-tests";
import { DayStepper } from "@/components/home/day-stepper";
import { StepRing } from "@/components/home/step-ring";
import { ToughDayToggle } from "@/components/home/tough-day";
import { requireViewer } from "@/lib/auth";
import { catchUpDays, todayContext } from "@/lib/data/today";
import { dateForDay, greeting, nextMilestone, phaseForDay } from "@/lib/plan/calendar";
import { DAY_STEPS, currentStep, type StepId } from "@/lib/plan/steps";
import { currentStreak } from "@/lib/plan/streak";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const ctx = await todayContext(db, viewer.id);
  const { settings, todayNo, kind, plan, progress } = ctx;
  const { phases, examFacts } = settings;
  const now = new Date();
  const phase = phaseForDay(todayNo, phases);
  const milestone = nextMilestone(examFacts.milestones, now);
  const prelims = examFacts.milestones.find((m) => m.id === "prelims");

  const [{ data: completedRows }, { data: profile }, { data: tip }, { data: sketches }, catchUp, { data: openMock }] = await Promise.all([
    db.from("daily_plans").select("day_no").eq("user_id", viewer.id).eq("status", "completed"),
    db.from("profiles").select("why_nid").eq("id", viewer.id).single(),
    plan?.tip_id ? db.from("tips").select("title,body,category").eq("id", plan.tip_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("sketch_logs").select("date").eq("user_id", viewer.id).order("date", { ascending: false }).limit(120),
    catchUpDays(db, viewer.id, todayNo),
    db.from("mock_attempts").select("id,mocks(title)").eq("user_id", viewer.id).is("submitted_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const completed = new Set((completedRows ?? []).map((p) => p.day_no as number));
  const freeDays = new Set(phases.phases.flatMap((p) => [...(p.restDays ?? []), ...(p.id === "EXAM" ? [p.fromDay] : [])]));
  const streak = currentStreak(completed, todayNo, freeDays);
  const sketchDays = new Set((sketches ?? []).map((s) => s.date as string));
  let sketchStreak = 0;
  for (let d = 0; d < 120; d++) {
    const key = dateForDay(todayNo - d, phases.startDate);
    if (sketchDays.has(key)) sketchStreak++;
    else if (d > 0) break;
  }

  const n = todayNo;
  const hrefs: Partial<Record<StepId, string>> = plan
    ? {
        warmup: `/day/${n}/warmup`,
        test: plan.mock_id ? `/mocks/${plan.mock_id}` : `/day/${n}/test`,
        result: `/day/${n}/result`,
        homework: "/homework",
        task: plan.daily_task_id ? `/studio/task/${plan.daily_task_id}?plan=${plan.id}&ctx=daily` : undefined,
        reflection: `/day/${n}/reflect`,
      }
    : {};
  const steps = progress?.steps ?? {};
  const next = currentStep(steps);
  const nextStep = DAY_STEPS.find((s) => s.id === next);
  const doneCount = DAY_STEPS.filter((s) => steps[s.id]).length;

  const headline =
    kind === "before-start" ? `Day 1 starts in ${1 - n} day${1 - n === 1 ? "" : "s"}`
    : kind === "after-plan" ? "Mains sprint"
    : `Day ${n} of ${phases.totalDays}`;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-ink-2">
          {greeting(now)}, {viewer.displayName}
        </p>
        <h1 className="font-serif text-4xl leading-tight">{headline}</h1>
        {phase && kind !== "before-start" && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <Badge tone="accent">
              {phase.id} · {phase.name}
            </Badge>
            {kind === "mock" && <Badge tone="warn">Mock day</Badge>}
            {plan?.tough_day && <Badge>Tough-day mode</Badge>}
          </p>
        )}
      </header>

      {kind === "exam" && (
        <Card className="border-accent bg-accent-soft">
          <p className="font-serif text-2xl">Exam day. You&apos;re ready.</p>
          <p className="mt-1 text-ink-2">No practice today. Eat well, reach early, read every brief twice, and plan minutes per mark before you start.</p>
          <ButtonLink href="/exam-day" className="mt-4">
            Exam-day checklist <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </Card>
      )}

      {kind === "rest" && (
        <Card>
          <p className="font-serif text-2xl">Rest day</p>
          <p className="mt-1 text-ink-2">Light sketching only and an early night. The work is done; let it settle.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/exam-day" variant="secondary">Pack your kit</ButtonLink>
            <ButtonLink href={`/day/${n}/reflect`} variant="secondary">Reflection</ButtonLink>
          </div>
        </Card>
      )}

      <ContinueTests
        tests={plan ? [
          { key: `warmup:${plan.id}`, label: "Morning warm-up", href: `/day/${n}/warmup`, total: plan.warmup_item_ids.length },
          { key: `daily:${plan.id}`, label: `Day ${n} test`, href: `/day/${n}/test/questions`, total: plan.item_ids.length },
        ] : []}
        openMock={openMock ? { label: (openMock.mocks as unknown as { title: string } | null)?.title ?? "Mock", href: `/mocks/attempt/${openMock.id}` } : null}
      />

      {plan && progress && (kind === "study" || kind === "mock") && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-4 p-5">
            <StepRing done={doneCount} total={DAY_STEPS.length} />
            <div className="min-w-0 flex-1">
              {progress.complete ? (
                <>
                  <p className="font-serif text-2xl">Day {n} complete ✓</p>
                  <p className="text-sm text-ink-2">Great work. Do a 15-minute sketch if you have energy left.</p>
                </>
              ) : (
                <>
                  <CardLabel>Next up</CardLabel>
                  <p className="font-serif text-2xl leading-tight">{nextStep?.label}</p>
                  <p className="text-sm text-ink-2">{nextStep?.detail}</p>
                </>
              )}
            </div>
          </div>
          {!progress.complete && next && hrefs[next] && (
            <Link href={hrefs[next]!} className="flex min-h-14 items-center justify-between bg-accent px-5 text-accent-ink">
              <span className="font-medium">{next === "test" && plan.mock_id ? "Open today's mock" : `Start: ${nextStep?.label}`}</span>
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
          {!plan.mock_id && (
            <div className="border-t border-line px-5 py-3">
              <div className="flex justify-between text-xs text-ink-2">
                <span>Items attempted today</span>
                <span className="tabular-nums">
                  {progress.attempted}/{progress.required}
                </span>
              </div>
              <ProgressBar value={progress.attempted} max={progress.required} label="Items attempted" tone={progress.attempted >= progress.required ? "good" : "accent"} className="mt-1.5" />
            </div>
          )}
        </Card>
      )}

      {catchUp.length > 0 && (
        <Card className="border-warn">
          <CardLabel>Catch-up</CardLabel>
          <p className="mt-1 text-sm text-ink-2">These days aren&apos;t finished yet. No stress: pick them up when you can.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {catchUp.map((c) => (
              <li key={c.id}>
                <ButtonLink href={`/day/${c.day_no}/test`} variant="secondary" className="min-h-10">
                  Day {c.day_no}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {prelims && new Date(prelims.at) > now ? (
          <Card>
            <CardLabel>
              <CalendarClock className="mr-1 inline size-3.5" aria-hidden />
              Countdown
            </CardLabel>
            <div className="mt-2">
              <Countdown label="DAT Prelims" at={prelims.at} />
            </div>
            {milestone && milestone.id !== "prelims" && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">
                Next: <span className="font-medium text-ink">{milestone.label}</span> · {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(milestone.at))}
              </p>
            )}
          </Card>
        ) : (
          milestone && (
            <Card>
              <CardLabel>Next milestone</CardLabel>
              <div className="mt-2">
                <Countdown label={milestone.label} at={milestone.at} note={milestone.note} />
              </div>
            </Card>
          )
        )}
        <Card>
          <CardLabel>Momentum</CardLabel>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <dt className="flex items-center gap-1 text-xs text-ink-2"><Flame className="size-3.5 text-accent" aria-hidden />Streak</dt>
              <dd className="font-serif text-3xl tabular-nums">{streak}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-ink-2"><Pencil className="size-3.5" aria-hidden />Sketch</dt>
              <dd className="font-serif text-3xl tabular-nums">{sketchStreak}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Days done</dt>
              <dd className="font-serif text-3xl tabular-nums">{completed.size}</dd>
            </div>
          </dl>
          <Link href="/studio/sketch" className="mt-2 inline-block text-sm text-accent underline-offset-2 hover:underline">
            Log today&apos;s 15-min sketch →
          </Link>
        </Card>
      </div>

      {settings.mentorMessage && (
        <Card className="bg-surface-2">
          <CardLabel>From GB</CardLabel>
          <p className="mt-2 font-serif text-xl leading-snug">{settings.mentorMessage}</p>
        </Card>
      )}

      {plan?.tough_day && profile?.why_nid && (
        <Card className="border-accent">
          <CardLabel>Why you started</CardLabel>
          <p className="mt-2 font-serif text-lg leading-snug">&ldquo;{profile.why_nid}&rdquo;</p>
        </Card>
      )}

      {tip && (
        <Card>
          <CardLabel>
            <Sparkles className="mr-1 inline size-3.5 text-accent" aria-hidden />
            Tip of the day
          </CardLabel>
          <p className="mt-2 font-medium">{tip.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{tip.body}</p>
        </Card>
      )}

      {(kind === "study" || kind === "mock" || kind === "before-start") && (
        <Card>
          <div className="flex items-baseline justify-between">
            <CardLabel>{kind === "before-start" ? "Your daily loop" : `Day ${n} loop`}</CardLabel>
          </div>
          <div className="mt-3">
            <DayStepper state={steps} hrefs={hrefs} />
          </div>
          {plan && !progress?.complete && (
            <div className="mt-4 border-t border-line pt-4">
              <ToughDayToggle planId={plan.id} on={plan.tough_day} />
            </div>
          )}
        </Card>
      )}

      {kind === "before-start" && !profile?.why_nid && (
        <Card className="border-accent">
          <p className="font-serif text-xl">Before Day 1: write your &ldquo;why NID&rdquo;</p>
          <p className="mt-1 text-sm text-ink-2">Two or three honest lines. You&apos;ll see them again on hard days.</p>
          <ButtonLink href="/more#why" className="mt-3" variant="secondary">
            Write it now
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
