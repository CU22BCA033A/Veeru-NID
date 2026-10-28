import { Nav } from "@/components/nav";
import { SyncPending } from "@/components/sync-pending";
import { requireViewer } from "@/lib/auth";
import { submitRun } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("student");
  return (
    <div className="pb-20 md:pb-0">
      <Nav
        brand="NID Prep Studio"
        items={[
          { href: "/", label: "Today", icon: "home", match: ["/day", "/homework"] },
          { href: "/studio", label: "Studio", icon: "studio" },
          { href: "/learn", label: "Learn", icon: "learn", match: ["/notebook", "/drill"] },
          { href: "/progress", label: "Progress", icon: "progress" },
          { href: "/more", label: "More", icon: "more", match: ["/mocks", "/exam-day", "/interview", "/journal"] },
        ]}
      />
      <SyncPending submit={submitRun} />
      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
