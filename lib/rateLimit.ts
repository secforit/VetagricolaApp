import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function createRateLimiter(options: RateLimitOptions) {
  const attempts = new Map<string, RateLimitEntry>();

  function isLimited(key: string): boolean {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now > entry.resetAt) {
      return false;
    }

    return entry.count >= options.maxAttempts;
  }

  function recordAttempt(key: string) {
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || now > entry.resetAt) {
      attempts.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return;
    }

    entry.count += 1;
  }

  return {
    isLimited,
    recordAttempt,
  };
}
