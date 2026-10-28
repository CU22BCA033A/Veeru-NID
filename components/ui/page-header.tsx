import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, kicker, back, children }: { title: string; kicker?: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      {kicker && <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">{kicker}</p>}
      <h1 className="font-serif text-3xl leading-tight md:text-4xl">{title}</h1>
      {children && <div className="mt-2 text-ink-2">{children}</div>}
    </header>
  );
}
