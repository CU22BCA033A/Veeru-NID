import { notFound } from "next/navigation";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getItems } from "@/lib/data/items";
import { supabaseServer } from "@/lib/supabase/server";
import { EditForm } from "./edit-form";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const [item] = await getItems(db, [decodeURIComponent(id)]);
  if (!item) notFound();
  const { data: meta } = await db.from("items").select("status,needs_review").eq("id", item.id).single();
  return (
    <div className="space-y-5">
      <PageHeader title="Edit question" kicker={item.id} back={{ href: "/admin/content", label: "Content" }} />
      <Card>
        <CardLabel>As Veeru sees it</CardLabel>
        {item.stem_svg && <div className="puzzle-svg mx-auto my-3 max-w-sm" dangerouslySetInnerHTML={{ __html: item.stem_svg }} />}
        {item.options && (
          <ul className="mt-2 space-y-1 text-sm">
            {item.options.map((o) => (
              <li key={o.id} className={(Array.isArray(item.answer) ? item.answer.includes(o.id) : item.answer === o.id) ? "font-semibold text-good" : ""}>
                {o.id}) {o.text ?? (o.svg ? "[picture]" : "")}
              </li>
            ))}
          </ul>
        )}
        {item.model_answer && <p className="mt-2 text-sm text-ink-2">Model answer: {item.model_answer}</p>}
      </Card>
      <Card>
        <EditForm id={item.id} stem={item.stem} explanation={item.explanation} takeaway={item.takeaway ?? ""} status={(meta?.status as "live") ?? "live"} needsReview={Boolean(meta?.needs_review)} />
      </Card>
    </div>
  );
}
