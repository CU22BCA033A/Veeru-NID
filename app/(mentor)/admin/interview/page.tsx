import { Card, CardLabel } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";
import { CommentBox } from "./comment-box";

export default async function MentorInterview() {
  const db = await supabaseServer();
  const { data } = await db.from("interview_answers").select("id,question,audio_path,transcript,duration_s,self_rating,mentor_comment,created_at").order("created_at", { ascending: false }).limit(60);
  const urls = await signedSheetUrls(db, (data ?? []).map((d) => d.audio_path as string).filter(Boolean));
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-4">
      <PageHeader title="Interview recordings" kicker="Review" back={{ href: "/admin/review", label: "Review" }} />
      {!data?.length ? <Empty title="No recordings yet" /> : data.map((d) => (
        <Card key={d.id as string}>
          <CardLabel>{fmt.format(new Date(d.created_at as string))} · {d.duration_s as number}s</CardLabel>
          <p className="mt-1 font-medium">{d.question as string}</p>
          {d.audio_path && urls.get(d.audio_path as string) && <audio controls src={urls.get(d.audio_path as string)} className="mt-2 w-full" />}
          {d.transcript && <details className="mt-2 text-sm text-ink-2"><summary className="cursor-pointer">Transcript</summary><p className="mt-1">{d.transcript as string}</p></details>}
          {d.self_rating && <p className="mt-2 text-xs text-ink-3">Self-rating: {Object.entries(d.self_rating as Record<string, number>).map(([k, v]) => `${k} ${v}/5`).join(" · ")}</p>}
          <CommentBox id={d.id as string} initial={(d.mentor_comment as string) ?? ""} />
        </Card>
      ))}
    </div>
  );
}
