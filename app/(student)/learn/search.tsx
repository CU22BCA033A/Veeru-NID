"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export function LearnSearch({ index }: { index: { id: string; title: string; sub: string }[] }) {
  const [q, setQ] = useState("");
  const hits = q.trim().length < 2 ? [] : index.filter((i) => `${i.title} ${i.sub}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search concept cards</span>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: perspective, Warli, complementary…" className="min-h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-3" />
      </label>
      {hits.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
          {hits.map((h) => (
            <li key={h.id + h.title}>
              <Link href={`/learn/${h.id}`} className="block px-4 py-3 text-sm hover:bg-surface-2">
                <span className="font-medium">{h.title}</span> <span className="text-ink-3">· {h.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
