import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const FORMAT: Record<string, string> = { "2026": "2026 pattern", mixed: "Objective + drawing", mini: "Mini (90 min)", aptitude: "Aptitude & objective (MCQ, auto-marked)" };

export default async function MocksPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const [{ data: mocks }, { data: attempts }] = await Promise.all([
    db.from("mocks").select("id,title,format,duration_min,total_marks").eq("status", "live").order("id"),
    db.from("mock_attempts").select("id,mock_id,submitted_at,est_score").eq("user_id", viewer.id),
  ]);
  const byMock = new Map((attempts ?? []).map((a) => [a.mock_id as string, a]));
  const groups = ["mini", "aptitude", "2026", "mixed"];
  return (
    <div className="space-y-6">
      <PageHeader title="Mock exams" kicker="Real exam format" back={{ href: "/more", label: "More" }}>
        Drawing mocks follow the 2026 Prelims (3 hours, 100 marks): do them on screen with the timer, or print the paper and work on real sheets. Aptitude mocks are 50 timed MCQs with picture questions, marked instantly.
      </PageHeader>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 font-serif text-xl">{FORMAT[g]}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {(mocks ?? []).filter((m) => m.format === g).map((m) => {
              const a = byMock.get(m.id as string);
              return (
                <li key={m.id as string}>
                  <Link href={a?.submitted_at ? `/mocks/attempt/${a.id}/result` : `/mocks/${m.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="flex-1">
                      <span className="block font-medium">{m.title as string}</span>
                      <span className="flex items-center gap-1 text-xs text-ink-3"><Clock className="size-3" aria-hidden />{m.duration_min as number} min · {m.total_marks as number} marks</span>
                    </span>
                    {a?.submitted_at ? (
                      <Badge tone="good"><CheckCircle2 className="mr-1 size-3" aria-hidden />{Number(a.est_score)}/{m.total_marks as number}</Badge>
                    ) : a ? (
                      <Badge tone="warn">In progress</Badge>
                    ) : (
                      <ChevronRight className="size-4 text-ink-3" aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
