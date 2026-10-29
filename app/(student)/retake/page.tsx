import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Runner } from "@/components/runner/runner";
import { requireViewer } from "@/lib/auth";
import { getItems, toClientItems } from "@/lib/data/items";
import { RETAKE_MAX, safeBack } from "@/lib/retake";
import { supabaseServer } from "@/lib/supabase/server";
import { submitRun } from "../actions";

/** Retake: the same questions again, for practice. Explanations were already seen, so it doesn't change ratings. */
export default async function RetakePage({ searchParams }: { searchParams: Promise<{ ids?: string; label?: string; back?: string; run?: string }> }) {
  await requireViewer("student");
  const { ids: raw, label, back, run } = await searchParams;
  const ids = [...new Set((raw ?? "").split(",").filter((x) => /^[\w.:-]{1,80}$/.test(x)))].slice(0, RETAKE_MAX);
  const runId = /^\d{1,16}$/.test(run ?? "") ? run! : null;
  if (!ids.length || !runId) notFound();
  const db = await supabaseServer();
  const items = await toClientItems(db, await getItems(db, ids));
  if (!items.length) notFound();
  const title = (label ?? "Test").slice(0, 60);
  const backHref = safeBack(back);
  return (
    <div>
      <PageHeader title={`Retake: ${title}`} kicker="Practice round" back={{ href: backHref, label: "Back" }}>
        Same questions again. This round is for practice: it doesn&apos;t add homework or change your skill levels.
      </PageHeader>
      <Runner
        storageKey={`retake:${runId}`}
        items={items}
        context="review"
        planId={null}
        minAnswered={1}
        submit={submitRun}
        doneHref={`/retake/done?${new URLSearchParams({ run: runId, label: title, back: backHref, ids: ids.join(",") }).toString()}`}
        title="Retake"
        submitLabel="Finish retake"
      />
    </div>
  );
}
