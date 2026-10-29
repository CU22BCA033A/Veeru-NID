/** Shown instantly while a page loads on the server, so taps get immediate feedback. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-surface-2" />
        <div className="h-8 w-56 rounded-lg bg-surface-2" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-2" />)}
      </div>
      <div className="h-40 rounded-2xl bg-surface-2" />
      <div className="h-28 rounded-2xl bg-surface-2" />
    </div>
  );
}
