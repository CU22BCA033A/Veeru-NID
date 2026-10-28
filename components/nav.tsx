"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, ClipboardCheck, House, Image as ImageIcon, LayoutDashboard, Library, LineChart, Menu, PenTool, Settings, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  home: House, studio: PenTool, learn: BookOpen, progress: LineChart, more: Menu,
  overview: LayoutDashboard, review: ClipboardCheck, content: Library, images: ImageIcon, settings: Settings,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Extra path prefixes that should highlight this tab. */
  match?: string[];
  badge?: number;
}

/** Bottom tab bar on phones, slim top bar on wider screens. */
export function Nav({ items, brand }: { items: NavItem[]; brand: string }) {
  const path = usePathname();
  const isActive = (item: NavItem) =>
    item.href === "/" || item.href === "/admin"
      ? path === item.href || (item.match ?? []).some((m) => path.startsWith(m))
      : path.startsWith(item.href) || (item.match ?? []).some((m) => path.startsWith(m));
  return (
    <>
      <header className="sticky top-0 z-20 hidden border-b border-line bg-paper/90 backdrop-blur md:block print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Link href={items[0]!.href} className="font-serif text-lg">
            {brand}
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {items.map((item) => {
              const Icon = ICONS[item.icon]!;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", active ? "bg-accent-soft font-semibold text-accent" : "text-ink-2 hover:bg-surface-2")}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                  {item.badge ? <span className="rounded-full bg-accent px-1.5 text-xs text-accent-ink">{item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <ul className="mx-auto flex max-w-lg justify-around">
          {items.map((item) => {
            const Icon = ICONS[item.icon]!;
            const active = isActive(item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]", active ? "font-semibold text-accent" : "text-ink-3")}
                >
                  <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
                  {item.label}
                  {item.badge ? <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-accent-ink">{item.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
