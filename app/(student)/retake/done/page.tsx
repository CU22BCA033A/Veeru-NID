import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ResultItem } from "@/components/item/result-item";
import { requireViewer } from "@/lib/auth";
import { resultRows } from "@/lib/data/results";
import { retakeHref, safeBack } from "@/lib/retake";
import { supabaseServer } from "@/lib/supabase/server";

export default async function RetakeDone({ searchParams }: { searchParams: Promise<{ run?: string; label?: string; back?: string; ids?: string }> }) {
  const viewer = await requireViewer("student");
  const { run, label, back, ids } = await searchParams;
  const runId = /^\d{1,16}$/.test(run ?? "") ? run! : "0";
  const db = await supabaseServer();
  const { data } = await db
    .from("attempts")
    .select("id,item_id,answer,correct,score,confidence,time_ms,note,created_at")
    .eq("user_id", viewer.id)
    .eq("context", "review")
    .like("client_id", `retake:${runId}:%`)
    .order("created_at");
  const attempts = data ?? [];
  const rows = await resultRows(db, attempts as never, attempts.map((a) => a.item_id as string));
  const right = rows.filter((r) => r.correct).length;
  const backHref = safeBack(back);
  const again = (ids ?? "").split(",").filter(Boolean);
  return (
    <div className="space-y-4">
      <PageHeader title={`Retake: ${right}/${rows.length}`} kicker={(label ?? "Test").slice(0, 60)} back={{ href: backHref, label: "Back" }}>
        Practice round: compare with your first try. Questions you still get wrong are worth a look in the notebook.
      </PageHeader>
      {rows.map((r) => <ResultItem key={r.attemptId} r={r} />)}
      {again.length > 0 && (
        <ButtonLink href={retakeHref(again, label ?? "Test", backHref)} variant="secondary" className="w-full">
          <RotateCcw className="size-4" aria-hidden /> Retake again
        </ButtonLink>
      )}
      <ButtonLink href={backHref} variant="ghost" className="w-full">Done</ButtonLink>
    </div>
  );
}
