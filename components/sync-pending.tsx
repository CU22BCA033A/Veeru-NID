"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { pendingSubmissions, removeSubmission } from "@/lib/offline/queue";
import type { RunnerSubmit } from "@/components/runner/runner";

/** Retries answers that were saved while offline. */
export function SyncPending({ submit }: { submit: (p: RunnerSubmit) => Promise<{ ok: boolean }> }) {
  const [count, setCount] = useState(0);
  const router = useRouter();
  useEffect(() => {
    const flush = async () => {
      const q = pendingSubmissions();
      setCount(q.length);
      if (!q.length || !navigator.onLine) return;
      for (const s of q) {
        try {
          const r = await submit(s.payload as RunnerSubmit);
          if (r.ok) removeSubmission(s.key);
        } catch {
          return;
        }
      }
      setCount(pendingSubmissions().length);
      router.refresh();
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [submit, router]);
  if (!count) return null;
  return (
    <div role="status" className="mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-xl bg-warn-soft px-4 py-2 text-sm text-warn">
      <CloudUpload className="size-4" aria-hidden /> {count} saved answer set{count > 1 ? "s" : ""} waiting to upload. They'll go as soon as you're online.
    </div>
  );
}
