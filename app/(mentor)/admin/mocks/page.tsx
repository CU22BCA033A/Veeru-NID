import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { supabaseServer } from "@/lib/supabase/server";
import { type MockAnswers } from "@/lib/data/mocks";

export default async function MentorMocks() {
  const db = await supabaseServer();
  const { data } = await db.from("mock_attempts").select("id,submitted_at,est_score,readiness,answers,mocks(title,total_marks,format)").not("submitted_at", "is", null).order("submitted_at", { ascending: false });
  type Row = { id: string; submitted_at: string; est_score: number; readiness: number | null; answers: MockAnswers; mocks: { title: string; total_marks: number; format: string } };
  const rows = (data ?? []) as unknown as Row[];
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  return (
    <div>
      <PageHeader title="Mock papers" kicker="Mark & review" back={{ href: "/admin", label: "Overview" }} />
      {!rows.length ? <Empty title="No mocks submitted yet" /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/mocks/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 hover:bg-surface-2">
                <span className="flex-1">
                  <span className="block font-medium">{r.mocks.title}</span>
                  <span className="text-xs text-ink-3">{fmt.format(new Date(r.submitted_at))} · readiness {r.readiness ?? "–"}</span>
                </span>
                <span className="tabular-nums">{Number(r.est_score)}/{r.mocks.total_marks}</span>
                {r.mocks.format === "aptitude" ? <Badge>Auto-marked</Badge> : r.answers.mentorMarks && Object.keys(r.answers.mentorMarks).length ? <Badge tone="good">Marked</Badge> : <Badge tone="warn">To mark</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
