import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { MockRunner } from "@/components/mock/mock-runner";
import { requireViewer } from "@/lib/auth";
import { getItems, toClientItems } from "@/lib/data/items";
import { getMock, type MockAnswers } from "@/lib/data/mocks";
import { signedSheetUrls } from "@/lib/data/sheets";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MockAttemptPage({ params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: att } = await db.from("mock_attempts").select("*").eq("id", aid).eq("user_id", viewer.id).maybeSingle();
  if (!att) notFound();
  if (att.submitted_at) redirect(`/mocks/attempt/${aid}/result`);
  const mock = await getMock(db, att.mock_id as string);
  if (!mock) notFound();
  const answers = (att.answers ?? {}) as MockAnswers;
  const objectiveItems = answers.objectiveItemIds?.length ? await toClientItems(db, await getItems(db, answers.objectiveItemIds)) : [];
  const allPaths = Object.values(answers.uploads ?? {}).flat();
  const thumbs = Object.fromEntries(await signedSheetUrls(db, allPaths));
  return (
    <div>
      <PageHeader title={mock.title} kicker={att.mode === "paper" ? "Paper mode" : "On-screen timer"} back={{ href: "/mocks", label: "Mocks" }} />
      <MockRunner
        attemptId={aid}
        viewerId={viewer.id}
        startedAt={att.started_at as string}
        durationMin={mock.duration_min}
        mode={att.mode as "screen" | "paper"}
        questions={mock.questions}
        objectiveItems={objectiveItems}
        initial={{ uploads: answers.uploads ?? {}, objective: answers.objective ?? {}, timeSplit: (att.time_split ?? {}) as Record<string, number>, thumbs }}
      />
    </div>
  );
}
