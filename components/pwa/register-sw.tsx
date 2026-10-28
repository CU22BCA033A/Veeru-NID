"use client";
import { useEffect } from "react";

/** Registers /sw.js in production builds only (dev reloads would fight the cache). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* unsupported or blocked: the app still works online */
    });
  }, []);
  return null;
}

/** Drops cached pages, e.g. on logout. */
export function clearCachedPages() {
  navigator.serviceWorker?.controller?.postMessage("clear-pages");
}

/** Sign-out button that also forgets cached pages before the server action runs. */
export function SignOutButton() {
  return (
    <button onClick={clearCachedPages} className="min-h-11 text-sm text-ink-2 underline">
      Sign out
    </button>
  );
}
