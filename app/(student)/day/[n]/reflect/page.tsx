import prompts from "@/content/observation-prompts.json";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { openDay } from "@/lib/data/day-guard";
import { ReflectForm } from "./reflect-form";

export default async function ReflectPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const { db, plan, viewer } = await openDay(n);
  const { data: r } = await db.from("reflections").select("mood,energy,sleep_hours,learned,observation").eq("user_id", viewer.id).eq("day_no", plan.day_no).maybeSingle();
  const prompt = prompts.prompts[(plan.day_no - 1) % prompts.prompts.length]!;
  return (
    <div>
      <PageHeader title="Reflection" kicker={`Day ${plan.day_no} · 1 minute`} back={{ href: "/", label: "Today" }} />
      <Card>
        <ReflectForm
          dayNo={plan.day_no}
          prompt={prompt}
          initial={{ mood: r?.mood ?? undefined, energy: r?.energy ?? undefined, sleep: r?.sleep_hours ? Number(r.sleep_hours) : undefined, learned: r?.learned ?? undefined, observation: r?.observation ?? undefined }}
        />
      </Card>
    </div>
  );
}
