import { notFound, redirect } from "next/navigation";
import { Monitor, Printer } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { getMock } from "@/lib/data/mocks";
import { supabaseServer } from "@/lib/supabase/server";
import { startMock } from "../actions";

export default async function MockOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const mock = await getMock(db, id);
  if (!mock) notFound();
  const { data: att } = await db.from("mock_attempts").select("id,submitted_at").eq("user_id", viewer.id).eq("mock_id", id).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (att?.submitted_at) redirect(`/mocks/attempt/${att.id}/result`);
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
      {att ? (
        <ButtonLink href={`/mocks/attempt/${att.id}`} className="w-full">Continue your attempt</ButtonLink>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
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
