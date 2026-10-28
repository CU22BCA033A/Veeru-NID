"use client";
/**
 * Offline-safe submissions. Answers are saved to localStorage as you go; if a submit fails
 * (no network), the payload is queued and retried when the connection returns.
 */
export interface QueuedSubmission {
  key: string;
  payload: unknown;
  queuedAt: number;
}

const QUEUE = "nidprep:pending";

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked: nothing else we can do */
  }
}

export const draft = {
  load: <T,>(key: string, fallback: T) => read<T>(`nidprep:draft:${key}`, fallback),
  save: (key: string, v: unknown) => write(`nidprep:draft:${key}`, v),
  clear: (key: string) => {
    try {
      localStorage.removeItem(`nidprep:draft:${key}`);
    } catch {
      /* ignore */
    }
  },
};

export function queueSubmission(key: string, payload: unknown) {
  const q = read<QueuedSubmission[]>(QUEUE, []).filter((s) => s.key !== key);
  q.push({ key, payload, queuedAt: Date.now() });
  write(QUEUE, q);
}

export function pendingSubmissions(): QueuedSubmission[] {
  return read<QueuedSubmission[]>(QUEUE, []);
}

export function removeSubmission(key: string) {
  write(QUEUE, read<QueuedSubmission[]>(QUEUE, []).filter((s) => s.key !== key));
}
