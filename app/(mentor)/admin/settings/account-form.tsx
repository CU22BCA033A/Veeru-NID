"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { keepFormOnSubmit } from "@/lib/hooks/use-keep-form";
import { saveAccount } from "./actions";

const field = "mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base";

export function AccountForm({ role, username, displayName }: { role: "student" | "mentor"; username: string; displayName: string }) {
  const [state, action, pending] = useActionState(saveAccount, { message: null });
  return (
    <form onSubmit={keepFormOnSubmit(action)} className="space-y-3">
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-ink-2">
          Name on screen
          <input name="displayName" defaultValue={displayName} className={field} />
        </label>
        <label className="block text-sm text-ink-2">
          Username
          <input name="username" defaultValue={username} autoCapitalize="none" className={field} />
        </label>
        <label className="block text-sm text-ink-2">
          New password
          <input name="password" type="password" placeholder="leave blank to keep" autoComplete="new-password" className={field} />
        </label>
      </div>
      {state.message && <p role="status" className="text-sm text-ink-2">{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : `Save ${role === "student" ? "Veeru's" : "my"} login`}</Button>
    </form>
  );
}
