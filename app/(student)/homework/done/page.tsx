import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomeworkDone() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const since = new Date(Date.now() - 2 * 3600_000).toISOString();
  const { data } = await db.from("attempts").select("correct").eq("user_id", viewer.id).eq("context", "homework").gte("created_at", since);
  const right = (data ?? []).filter((a) => a.correct).length;
  return (
    <div>
      <PageHeader title="Homework done ✓" back={{ href: "/", label: "Today" }} />
      <Card>
        <p className="font-serif text-3xl">{right}/{data?.length ?? 0} right this time</p>
        <p className="mt-1 text-ink-2">Anything you still missed will come back as a spaced review in a day or two.</p>
        <div className="mt-4 flex gap-2">
          <ButtonLink href="/">Back to today</ButtonLink>
          <ButtonLink href="/notebook" variant="secondary">Mistake notebook</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
