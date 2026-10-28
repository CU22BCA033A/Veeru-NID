import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { signedSheetUrls } from "@/lib/data/sheets";
import { addDays, istDateString } from "@/lib/plan/calendar";
import { supabaseServer } from "@/lib/supabase/server";
import { SketchForm } from "./sketch-form";

export default async function SketchPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data } = await db.from("sketch_logs").select("date,minutes,image_path").eq("user_id", viewer.id).order("date", { ascending: false }).limit(120);
  const logs = data ?? [];
  const days = new Set(logs.map((l) => l.date as string));
  const today = istDateString(new Date());
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    if (days.has(d)) streak++;
    else if (i > 0) break;
  }
  const total = logs.reduce((s, l) => s + (l.minutes as number), 0);
  const urls = await signedSheetUrls(db, logs.map((l) => l.image_path as string).filter(Boolean).slice(0, 24));
  return (
    <div className="space-y-5">
      <PageHeader title="Sketch streak" kicker="15 minutes a day" back={{ href: "/studio", label: "Studio" }}>
        Free sketching, anything you see: hands, shoes, people at the bus stop, your kitchen. Little and often beats long and rare.
      </PageHeader>
      <Card className="grid grid-cols-3 text-center">
        <div><p className="font-serif text-4xl">{streak}</p><p className="text-xs text-ink-2">day streak</p></div>
        <div><p className="font-serif text-4xl">{days.size}</p><p className="text-xs text-ink-2">days logged</p></div>
        <div><p className="font-serif text-4xl">{Math.round(total / 60)}</p><p className="text-xs text-ink-2">hours</p></div>
      </Card>
      <Card>
        <CardLabel className="mb-3">Log today</CardLabel>
        <SketchForm viewerId={viewer.id} />
      </Card>
      {urls.size > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[...urls.values()].map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="Sketch" className="aspect-square w-full rounded-lg border border-line object-cover" loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}
