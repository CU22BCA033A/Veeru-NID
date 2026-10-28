import { PageHeader } from "@/components/ui/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { loadAnalytics } from "@/lib/data/analytics";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const a = await loadAnalytics(db, viewer.id, await loadSettings());
  return (
    <div>
      <PageHeader title="Progress" kicker={a.todayNo >= 1 ? `Day ${a.todayNo}` : "Before Day 1"}>How you&apos;re doing, honestly and in one place.</PageHeader>
      <ProgressView a={a} />
    </div>
  );
}
