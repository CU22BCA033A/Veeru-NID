/** Supabase returns at most 1000 rows per request; page through everything. */
export async function fetchAll<T>(
  query: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return out;
  }
}
