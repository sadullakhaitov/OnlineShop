/**
 * A small in-memory limit for cheap checks such as promo codes. It counts per
 * running server, which is enough to slow down guessing; sign-in codes have
 * their own limits in the database.
 */
const hits = new Map<string, number[]>();

export function allowAttempt(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Old keys are dropped now and then so the map does not grow forever.
  if (hits.size > 5_000) for (const [other, times] of hits) if (times.every((time) => now - time >= windowMs)) hits.delete(other);
  return true;
}
