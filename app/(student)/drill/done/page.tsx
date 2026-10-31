import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ResultsList } from "@/components/item/results-list";
import { requireViewer } from "@/lib/auth";
import { resultRows } from "@/lib/data/results";
import { retakeHref } from "@/lib/retake";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DrillDone() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data } = await db.from("attempts").select("id,item_id,answer,correct,score,confidence,time_ms,note,created_at").eq("user_id", viewer.id).eq("context", "drill").gte("created_at", since).order("created_at", { ascending: false }).limit(10);
  const attempts = [...(data ?? [])].reverse();
  const rows = await resultRows(db, attempts as never, attempts.map((a) => a.item_id as string));
  const right = rows.filter((r) => r.correct).length;
  return (
    <div className="space-y-4">
      <PageHeader title={`Drill: ${right}/${rows.length}`} back={{ href: "/learn", label: "Learn" }}>Mistakes went into homework and your notebook.</PageHeader>
      <ResultsList rows={rows} />
      {rows.length > 0 && (
        <ButtonLink href={retakeHref(rows.map((r) => r.item.id), "Drill", "/learn")} variant="secondary" className="w-full">
          <RotateCcw className="size-4" aria-hidden /> Retake this drill
        </ButtonLink>
      )}
      <ButtonLink href="/drill" variant="secondary" className="w-full">Another drill</ButtonLink>
    </div>
  );
}
