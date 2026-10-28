"use client";
import { useState, useTransition } from "react";
import { BookCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { skipHomework } from "@/app/(student)/actions";

/** Soft lock: earlier homework should be done first, but it can be skipped with a reason. */
export function HomeworkGate({ count }: { count: number }) {
  const [skipping, setSkipping] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-warn bg-warn-soft p-5">
      <p className="flex items-center gap-2 font-medium text-warn">
        <BookCheck className="size-5" aria-hidden /> {count} homework item{count > 1 ? "s" : ""} from earlier days
      </p>
      <p className="mt-1 text-sm">Fixing yesterday&apos;s mistakes first makes today count more.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href="/homework">Do homework first</ButtonLink>
        <Button variant="ghost" onClick={() => setSkipping((v) => !v)}>Skip for now</Button>
      </div>
      {skipping && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(() => skipHomework(reason));
          }}
        >
          <label className="sr-only" htmlFor="skip-reason">Reason for skipping</label>
          <input id="skip-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. school exam today)" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
          <Button type="submit" variant="secondary" disabled={pending || reason.trim().length < 3}>Skip</Button>
        </form>
      )}
    </div>
  );
}
