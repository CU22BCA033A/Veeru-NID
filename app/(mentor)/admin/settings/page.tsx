import { Card, CardLabel } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";
import { loadSettings } from "@/lib/config/settings";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";
import { signOut } from "@/app/login/actions";
import { SignOutButton } from "@/components/pwa/register-sw";
import { AccountForm } from "./account-form";
import { SettingsForm } from "./settings-form";
import { SyncButton } from "./sync-button";

export const maxDuration = 60;

export default async function SettingsPage() {
  const viewer = await requireViewer("mentor");
  const s = await loadSettings();
  const db = await supabaseServer();
  const { data: meta } = await db.from("settings").select("content_version,content_synced_at").eq("id", 1).maybeSingle();
  const { data: student } = await db.from("profiles").select("id,display_name").eq("role", "student").limit(1).maybeSingle();
  const admin = supabaseAdmin();
  const studentEmail = student ? (await admin.auth.admin.getUserById(student.id as string)).data.user?.email : undefined;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" kicker="Mentor" />
      <Card>
        <CardLabel className="mb-3">Home screen & plan</CardLabel>
        <SettingsForm mentorMessage={s.mentorMessage ?? ""} startDate={s.phases.startDate} targetReadiness={s.phases.targetReadiness} />
      </Card>
      <Card>
        <CardLabel className="mb-1">Content</CardLabel>
        <p className="mb-3 text-sm text-ink-2">
          After each app update, tap sync so new questions, tasks and tips reach Veeru. Uploaded photos and Veeru&apos;s progress are never touched.
          {meta?.content_synced_at && <> Last synced {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(meta.content_synced_at as string))}.</>}
        </p>
        <SyncButton />
      </Card>
      {student && (
        <Card>
          <CardLabel className="mb-3">Veeru&apos;s login</CardLabel>
          <AccountForm role="student" username={emailToUsername(studentEmail) ?? studentEmail ?? ""} displayName={student.display_name as string} />
        </Card>
      )}
      <Card>
        <CardLabel className="mb-3">My login</CardLabel>
        <AccountForm role="mentor" username={emailToUsername(viewer.email) ?? viewer.email ?? ""} displayName={viewer.displayName} />
      </Card>
      <form action={signOut}>
        <SignOutButton />
      </form>
    </div>
  );
}
