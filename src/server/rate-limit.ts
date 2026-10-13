/** Fixed-window in-memory rate limiter. Replace with a shared store (e.g. Redis) when running several instances. */
export class RateLimiter {
  private hits = new Map<string, { count: number; reset: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}
  check(key: string, now = Date.now()): { ok: boolean; retryAfterMs: number } {
    const h = this.hits.get(key);
    if (!h || h.reset <= now) {
      this.hits.set(key, { count: 1, reset: now + this.windowMs });
      return { ok: true, retryAfterMs: 0 };
    }
    if (h.count >= this.limit) return { ok: false, retryAfterMs: h.reset - now };
    h.count++;
    return { ok: true, retryAfterMs: 0 };
  }
}
