import Link from "next/link";
import { ChevronRight, Mic } from "lucide-react";
import bank from "@/content/interview.json";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function InterviewPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data } = await db.from("interview_answers").select("question").eq("user_id", viewer.id);
  const counts = new Map<string, number>();
  for (const a of data ?? []) counts.set(a.question as string, (counts.get(a.question as string) ?? 0) + 1);
  const groups = [...new Set(bank.questions.map((q) => q.group))];
  return (
    <div className="space-y-6">
      <PageHeader title="Interview practice" kicker="In-Person Sensitivity Test" back={{ href: "/more", label: "More" }}>{bank.intro}</PageHeader>
      <Card className="flex items-center gap-3 bg-accent-soft"><Mic className="size-5 text-accent" aria-hidden /><p className="text-sm">{data?.length ?? 0} answers recorded. Aim to record each question at least twice before the Mains.</p></Card>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 font-serif text-xl">{g}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {bank.questions.filter((q) => q.group === g).map((q) => (
              <li key={q.id}>
                <Link href={`/interview/${q.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="flex-1 text-sm">{q.q}</span>
                  {counts.get(q.q) ? <span className="text-xs text-good">{counts.get(q.q)}×</span> : null}
                  <ChevronRight className="size-4 text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
