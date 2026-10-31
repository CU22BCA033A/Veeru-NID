import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ResultsList } from "@/components/item/results-list";
import { requireViewer } from "@/lib/auth";
import { resultRows } from "@/lib/data/results";
import { retakeHref } from "@/lib/retake";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PracticeDone({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const viewer = await requireViewer("student");
  const { run } = await searchParams;
  const runId = /^\d{1,16}$/.test(run ?? "") ? run! : "0";
  const db = await supabaseServer();
  const { data } = await db
    .from("attempts")
    .select("id,item_id,answer,correct,score,confidence,time_ms,note,created_at")
    .eq("user_id", viewer.id)
    .like("client_id", `practice:${runId}:%`)
    .order("created_at");
  const attempts = data ?? [];
  const rows = await resultRows(db, attempts as never, attempts.map((a) => a.item_id as string));
  const right = rows.filter((r) => r.correct).length;
  return (
    <div className="space-y-4">
      <PageHeader title={`Extra test: ${right}/${rows.length}`} back={{ href: "/", label: "Today" }}>
        {rows.length - right > 0 ? "Read each mistake below: the correct answer and the reason are right there. They're also in your homework." : "Every answer correct. Brilliant!"}
      </PageHeader>
      <ResultsList rows={rows} />
      {rows.length > 0 && (
        <ButtonLink href={retakeHref(rows.map((r) => r.item.id), "Extra test", `/practice/done?run=${runId}`)} variant="secondary" className="w-full">
          <RotateCcw className="size-4" aria-hidden /> Retake these questions
        </ButtonLink>
      )}
      <ButtonLink href="/" variant="ghost" className="w-full">Back to today</ButtonLink>
    </div>
  );
}
