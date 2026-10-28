import { notFound } from "next/navigation";
import taxonomy from "@/content/taxonomy.json";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ConceptPage({ params }: { params: Promise<{ subtopic: string }> }) {
  const { subtopic } = await params;
  const viewer = await requireViewer("student");
  const cat = taxonomy.categories.find((c) => c.subtopics.some((s) => s.id === subtopic));
  const sub = cat?.subtopics.find((s) => s.id === subtopic);
  if (!cat || !sub) notFound();
  const db = await supabaseServer();
  const [{ data: cards }, { data: rating }, { count: wrong }] = await Promise.all([
    db.from("concept_cards").select("id,title,body,svg").eq("subtopic_id", subtopic),
    db.from("skill_ratings").select("rating,attempts").eq("user_id", viewer.id).eq("subtopic_id", subtopic).maybeSingle(),
    db.from("attempts").select("id,items!inner(subtopic_id)", { count: "exact", head: true }).eq("user_id", viewer.id).eq("correct", false).eq("items.subtopic_id", subtopic),
  ]);
  return (
    <div className="space-y-5">
      <PageHeader title={sub.name} kicker={cat.name} back={{ href: "/learn", label: "Learn" }}>
        {rating ? `${rating.attempts} attempts so far · skill ${Math.round(Number(rating.rating))}` : "Not practised yet."}
        {wrong ? ` · ${wrong} mistakes logged` : ""}
      </PageHeader>
      {(cards ?? []).length ? (
        (cards ?? []).map((c) => (
          <Card key={c.id as string}>
            <h2 className="font-serif text-2xl">{c.title as string}</h2>
            {c.svg && <div className="puzzle-svg mx-auto my-4 max-w-sm" dangerouslySetInnerHTML={{ __html: c.svg as string }} />}
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{c.body as string}</p>
          </Card>
        ))
      ) : (
        <Empty title="Card coming soon">GB can add one from the content tools.</Empty>
      )}
      <ButtonLink href={`/drill?subtopic=${subtopic}`} className="w-full">Practise 10 questions on this</ButtonLink>
    </div>
  );
}
