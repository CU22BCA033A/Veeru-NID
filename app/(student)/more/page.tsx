import Link from "next/link";
import { BookMarked, ChevronRight, ClipboardList, FileText, Mic, NotebookPen, Timer } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { SignOutButton } from "@/components/pwa/register-sw";
import { WhyForm } from "./why-form";

const LINKS = [
  { href: "/mocks", label: "Mock exams", detail: "Full 3-hour papers in the 2026 pattern", icon: Timer },
  { href: "/exam-day", label: "Exam logistics", detail: "Dates, admit card, stationery kit, exam-day checklist", icon: ClipboardList },
  { href: "/interview", label: "Interview practice", detail: "Record answers for the in-person sensitivity test", icon: Mic },
  { href: "/journal", label: "Reflections & observation journal", detail: "Everything you noticed and learned", icon: FileText },
  { href: "/notebook", label: "Mistake notebook", detail: "Every wrong answer with your notes", icon: NotebookPen },
  { href: "/learn", label: "Strategy guides", detail: "How to plan 3 hours, draw people fast, and more", icon: BookMarked },
];

export default async function MorePage() {
  const viewer = await requireViewer("student");
  const db = await supabaseServer();
  const { data: profile } = await db.from("profiles").select("why_nid").eq("id", viewer.id).single();
  return (
    <div className="space-y-6">
      <PageHeader title="More" kicker={viewer.displayName} />
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-surface-2">
              <l.icon className="size-5 text-accent" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{l.label}</span>
                <span className="text-sm text-ink-2">{l.detail}</span>
              </span>
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Card id="why">
        <CardLabel>Why I want NID</CardLabel>
        <p className="mt-1 mb-3 text-sm text-ink-2">Write it honestly. It comes back on tough days.</p>
        <WhyForm initial={(profile?.why_nid as string) ?? ""} />
      </Card>
      <Card className="bg-surface-2 text-sm text-ink-2">
        <p className="font-medium text-ink">Look after yourself</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Sleep 7–8 hours. Memory and drawing skill consolidate during sleep.</li>
          <li>Every 45 minutes of screen time, look at something 6 metres away for 20 seconds and stretch your hands.</li>
          <li>Boards matter too. On heavy board-study days, switch on tough-day mode; your streak stays safe.</li>
        </ul>
      </Card>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </div>
  );
}
