import { Nav } from "@/components/nav";
import { requireViewer } from "@/lib/auth";
import { currentContentVersion } from "@/lib/seed/sync";
import { supabaseServer } from "@/lib/supabase/server";
import { ContentUpdateBanner } from "./content-update-banner";

export const dynamic = "force-dynamic";
// The "Load now" content sync can take up to a minute.
export const maxDuration = 60;

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("mentor");
  const db = await supabaseServer();
  const { data: settings } = await db.from("settings").select("content_version").eq("id", 1).maybeSingle();
  const outdated = settings?.content_version !== currentContentVersion();
  return (
    <div className="pb-20 md:pb-0">
      <Nav
        brand="Mentor · NID Prep"
        items={[
          { href: "/admin", label: "Overview", icon: "overview" },
          { href: "/admin/review", label: "Review", icon: "review" },
          { href: "/admin/content", label: "Content", icon: "content" },
          { href: "/admin/images", label: "Images", icon: "images" },
          { href: "/admin/settings", label: "Settings", icon: "settings" },
        ]}
      />
      {outdated && <div className="px-4"><ContentUpdateBanner /></div>}
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
