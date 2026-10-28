import Link from "next/link";
import { BookOpen, ChevronRight, Compass, NotebookPen, Target } from "lucide-react";
import strategy from "@/content/strategy.json";
import taxonomy from "@/content/taxonomy.json";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { weakestSubtopics } from "@/lib/plan/builder";
import { supabaseServer } from "@/lib/supabase/server";
import { LearnSearch } from "./search";

export default async function LearnPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const [{ data: cards }, { data: ratings }] = await Promise.all([
    db.from("concept_cards").select("id,subtopic_id,title"),
    db.from("skill_ratings").select("subtopic_id,rating,attempts").eq("user_id", viewer.id),
  ]);
  const weak = weakestSubtopics(new Map((ratings ?? []).map((r) => [r.subtopic_id as string, { rating: Number(r.rating), attempts: r.attempts as number }])));
  const names = new Map(taxonomy.categories.flatMap((c) => c.subtopics.map((s) => [s.id, s.name] as [string, string])));
  const index = (cards ?? []).map((c) => ({ id: c.subtopic_id as string, title: c.title as string, sub: names.get(c.subtopic_id as string) ?? "" }));

  return (
    <div className="space-y-6">
      <PageHeader title="Learn" kicker="Library">
        Short concept cards for every topic, exam strategy guides, and drills for your weak spots.
      </PageHeader>

      {weak.length > 0 && (
        <Card className="border-accent">
          <CardLabel className="flex items-center gap-1 text-accent"><Target className="size-3.5" aria-hidden />Your weakest topics</CardLabel>
          <ul className="mt-3 space-y-2">
            {weak.map((w) => (
              <li key={w} className="flex items-center justify-between gap-2">
                <Link href={`/learn/${w}`} className="font-medium underline-offset-2 hover:underline">{names.get(w)}</Link>
                <Link href={`/drill?subtopic=${w}`} className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-ink">Fix now</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/notebook" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <NotebookPen className="size-5 text-accent" aria-hidden /> <span className="font-medium">Mistake notebook</span>
        </Link>
        <Link href="/drill" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <Target className="size-5 text-accent" aria-hidden /> <span className="font-medium">10-item drill</span>
        </Link>
      </div>

      <LearnSearch index={index} />

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl"><Compass className="size-5" aria-hidden />Exam strategy guides</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {strategy.articles.map((a) => (
            <Link key={a.id} href={`/learn/guide/${a.id}`} className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-3">
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-ink-2">{a.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl"><BookOpen className="size-5" aria-hidden />Topics</h2>
        <div className="space-y-3">
          {taxonomy.categories.map((c) => (
            <details key={c.id} className="rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer items-center justify-between p-4">
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-ink-3">{c.subtopics.length} topics</span>
                </span>
                <ChevronRight className="size-4 text-ink-3" aria-hidden />
              </summary>
              <ul className="border-t border-line">
                {c.subtopics.map((s) => (
                  <li key={s.id}>
                    <Link href={`/learn/${s.id}`} className="flex min-h-12 items-center justify-between px-4 text-sm hover:bg-surface-2">
                      {s.name}
                      <ChevronRight className="size-4 text-ink-3" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
