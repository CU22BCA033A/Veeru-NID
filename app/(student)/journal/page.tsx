import Link from "next/link";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

const MOOD = ["", "😞", "😕", "😐", "🙂", "😄"];

export default async function JournalPage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data } = await db.from("reflections").select("day_no,mood,energy,sleep_hours,learned,observation").eq("user_id", viewer.id).order("day_no", { ascending: false }).limit(120);
  return (
    <div>
      <PageHeader title="Journal" kicker="Reflections" back={{ href: "/more", label: "More" }} />
      {!data?.length ? <Empty title="No reflections yet">Your daily reflections and observations will collect here.</Empty> : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.day_no as number} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <Link href={`/day/${r.day_no}/reflect`} className="font-medium underline-offset-2 hover:underline">Day {r.day_no as number}</Link>
                <span className="text-ink-2">{MOOD[r.mood as number]} · slept {Number(r.sleep_hours)}h</span>
              </div>
              {r.learned && <p className="mt-2 text-sm">{r.learned as string}</p>}
              {r.observation && <p className="mt-2 whitespace-pre-line rounded-lg bg-surface-2 p-2 text-sm text-ink-2">{r.observation as string}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
