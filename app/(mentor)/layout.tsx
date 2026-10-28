import { Nav } from "@/components/nav";
import { requireViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("mentor");
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
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
