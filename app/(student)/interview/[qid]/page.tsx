import { notFound } from "next/navigation";
import { Lightbulb, MessageSquareQuote } from "lucide-react";
import bank from "@/content/interview.json";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";
import { Recorder } from "../recorder";

export default async function InterviewQuestion({ params }: { params: Promise<{ qid: string }> }) {
  const { qid } = await params;
  const q = bank.questions.find((x) => x.id === qid);
  if (!q) notFound();
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: past } = await db.from("interview_answers").select("id,audio_path,created_at,duration_s,mentor_comment").eq("user_id", viewer.id).eq("question", q.q).order("created_at", { ascending: false }).limit(5);
  const urls = await signedSheetUrls(db, (past ?? []).map((p) => p.audio_path as string).filter(Boolean));
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-5">
      <PageHeader title={q.q} kicker={q.group} back={{ href: "/interview", label: "All questions" }} />
      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-medium"><Lightbulb className="size-4 text-accent" aria-hidden />What a strong answer shows</summary>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{q.look}</p>
      </details>
      <Recorder question={q.q} viewerId={viewer.id} />
      {(past ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl">Earlier attempts</h2>
          {(past ?? []).map((p) => (
            <Card key={p.id as string}>
              <CardLabel>{fmt.format(new Date(p.created_at as string))} · {p.duration_s as number}s</CardLabel>
              {p.audio_path && urls.get(p.audio_path as string) && <audio controls src={urls.get(p.audio_path as string)} className="mt-2 w-full" />}
              {p.mentor_comment && <p className="mt-2 flex gap-2 rounded-xl bg-accent-soft p-3 text-sm"><MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />{p.mentor_comment as string}</p>}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
