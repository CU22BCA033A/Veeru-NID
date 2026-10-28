import { notFound } from "next/navigation";
import { getMock } from "@/lib/data/mocks";
import { supabaseServer } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export default async function PrintMock({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const mock = await getMock(db, id);
  if (!mock) notFound();
  return (
    <article className="mx-auto max-w-[180mm] bg-white p-6 text-black print:p-0">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-widest">Practice paper · not an official NID paper</p>
        <h1 className="font-serif text-2xl">{mock.title}</h1>
        <p className="text-sm">Time: {mock.duration_min} minutes · Maximum marks: {mock.total_marks}</p>
        <p className="mt-2 text-xs">Instructions: Answer all questions on separate A4 sheets. Write the question number on every sheet. Use pencil; colours only where asked. Plan your time: suggested minutes are given for each question.</p>
      </header>
      {mock.questions.map((q) => (
        <section key={q.no} className="break-inside-avoid border-b border-neutral-300 py-4">
          <h2 className="flex justify-between font-semibold">
            <span>Q{q.no}. {q.title}</span>
            <span className="text-sm font-normal">[{q.marks} marks · ~{q.suggestedMinutes} min]</span>
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{q.prompt}</p>
          {q.parts.length > 0 && (
            <ol className="mt-2 space-y-1 text-sm">
              {q.parts.map((p) => <li key={p.label}>({p.label}) {p.prompt} <span className="text-neutral-600">[{p.marks}]</span></li>)}
            </ol>
          )}
          {q.kind === "objective" && <p className="mt-1 text-sm italic">Answer the objective section in the app.</p>}
        </section>
      ))}
    </article>
  );
}
