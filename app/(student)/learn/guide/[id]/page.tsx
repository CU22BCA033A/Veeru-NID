import { notFound } from "next/navigation";
import strategy from "@/content/strategy.json";
import { PageHeader } from "@/components/ui/page-header";

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = strategy.articles.find((x) => x.id === id);
  if (!a) notFound();
  return (
    <article>
      <PageHeader title={a.title} kicker="Strategy guide" back={{ href: "/learn", label: "Learn" }}>
        {a.summary}
      </PageHeader>
      <div className="space-y-6">
        {a.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-serif text-xl">{s.heading}</h2>
            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
