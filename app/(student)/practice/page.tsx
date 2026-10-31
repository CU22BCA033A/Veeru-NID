import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Runner } from "@/components/runner/runner";
import { RememberPractice } from "@/components/home/extra-test";
import { requireViewer } from "@/lib/auth";
import { getItems, toClientItems } from "@/lib/data/items";
import { RETAKE_MAX } from "@/lib/retake";
import { supabaseServer } from "@/lib/supabase/server";
import { submitRun } from "../actions";

const idList = (raw: string | undefined) => [...new Set((raw ?? "").split(",").filter((x) => /^[\w.:-]{1,80}$/.test(x)))].slice(0, RETAKE_MAX);

/** An extra mixed test. It counts like a drill: mistakes become homework, ratings update. */
export default async function PracticeTestPage({ searchParams }: { searchParams: Promise<{ run?: string; ids?: string; review?: string }> }) {
  await requireViewer("student");
  const { run, ids: rawIds, review } = await searchParams;
  const ids = idList(rawIds);
  const runId = /^\d{1,16}$/.test(run ?? "") ? run! : null;
  if (!ids.length || !runId) notFound();
  const db = await supabaseServer();
  const items = await toClientItems(db, await getItems(db, ids), new Set(idList(review)));
  if (!items.length) notFound();
  return (
    <div>
      <PageHeader title="Extra test" kicker={`${items.length} mixed questions`} back={{ href: "/", label: "Today" }}>
        Every category, mixed puzzle types. Mistakes go to your homework, just like the daily test.
      </PageHeader>
      <RememberPractice storageKey={`practice:${runId}`} total={items.length} />
      <Runner
        storageKey={`practice:${runId}`}
        items={items}
        context="drill"
        planId={null}
        minAnswered={Math.min(10, items.length)}
        submit={submitRun}
        doneHref={`/practice/done?${new URLSearchParams({ run: runId }).toString()}`}
        title="Extra test"
        submitLabel="Submit & see results"
      />
    </div>
  );
}
