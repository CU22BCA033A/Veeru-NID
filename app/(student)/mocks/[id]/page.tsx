import Link from "next/link";
import { notFound } from "next/navigation";
import { Monitor, Printer, RotateCcw } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { getMock, mockScore, type MockAnswers } from "@/lib/data/mocks";
import { supabaseServer } from "@/lib/supabase/server";
import { startMock } from "../actions";

export default async function MockOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const mock = await getMock(db, id);
  if (!mock) notFound();
  const { data: attempts } = await db.from("mock_attempts").select("id,submitted_at,answers").eq("user_id", viewer.id).eq("mock_id", id).order("started_at", { ascending: false });
  const open = (attempts ?? []).find((a) => !a.submitted_at);
  const done = (attempts ?? []).filter((a) => a.submitted_at);
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-5">
      <PageHeader title={mock.title} kicker={`${mock.duration_min} minutes · ${mock.total_marks} marks`} back={{ href: "/mocks", label: "Mocks" }} />
      <Card>
        <CardLabel>Before you start</CardLabel>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>Keep A4 sheets, pencils (HB, 2B, 4B), eraser, sharpener, scale and colours ready.</li>
          <li>Read the WHOLE paper first (5 minutes) and write a finishing time next to each question.</li>
          <li>Don&apos;t look at explanations or hints until you submit.</li>
          <li>Photograph your sheets for each question as you go, or all together at the end.</li>
        </ul>
        <p className="mt-3 text-sm text-ink-2">Questions: {mock.questions.map((q) => `Q${q.no} ${q.title} (${q.marks})`).join(" · ")}</p>
      </Card>
      {done.length > 0 && (
        <Card>
          <CardLabel>Your attempts</CardLabel>
          <ul className="mt-2 divide-y divide-line">
            {done.map((a, i) => {
              const sc = mockScore(mock, (a.answers ?? {}) as MockAnswers);
              return (
                <li key={a.id}>
                  <Link href={`/mocks/attempt/${a.id}/result`} className="flex min-h-11 items-center justify-between py-2 text-sm">
                    <span>Attempt {done.length - i} · {fmt.format(new Date(a.submitted_at as string))}</span>
                    <span className="tabular-nums text-ink-2">{sc.total}/{sc.reviewed ? mock.total_marks : `${sc.markedMax} marked`} ›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {open ? (
        <ButtonLink href={`/mocks/attempt/${open.id}`} className="w-full">Continue your attempt</ButtonLink>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {done.length > 0 && <p className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><RotateCcw className="size-4" aria-hidden />Retake this mock: a new attempt with a fresh timer</p>}
          <form action={startMock.bind(null, id, "screen")}>
            <Button type="submit" className="w-full"><Monitor className="size-4" aria-hidden />Start with on-screen timer</Button>
          </form>
          <form action={startMock.bind(null, id, "paper")}>
            <Button type="submit" variant="secondary" className="w-full"><Printer className="size-4" aria-hidden />I&apos;ll do it on printed paper</Button>
          </form>
        </div>
      )}
      <ButtonLink href={`/mocks/${id}/print`} variant="ghost" className="w-full">Open the printable paper</ButtonLink>
    </div>
  );
}
