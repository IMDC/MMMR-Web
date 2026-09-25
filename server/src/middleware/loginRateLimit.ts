import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Brute-force protection for POST /api/auth/login.
 *
 * Two independent buckets are checked on every attempt:
 *
 *   account  — keyed by username. Stops password guessing against one account
 *              no matter how many IPs the attacker rotates through. Tight limit.
 *   ip       — keyed by client IP. Catches one host spraying many usernames.
 *              Loose limit, because participants can share a NAT or carrier IP
 *              and must not lock each other out.
 *
 * Only failed attempts (401) are counted, and a successful login clears that
 * account's bucket. State is per-process and in memory, so a backend restart
 * clears every counter.
 */

type Bucket = { count: number; resetAt: number };

const accountAttempts = new Map<string, Bucket>();
const ipAttempts = new Map<string, Bucket>();

// Expired entries are swept periodically so a flood of junk usernames can't
// grow the maps without bound.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const map of [accountAttempts, ipAttempts]) {
    for (const [key, bucket] of map) {
      if (now >= bucket.resetAt) map.delete(key);
    }
  }
}

function isBlocked(map: Map<string, Bucket>, key: string, max: number, now: number) {
  const bucket = map.get(key);
  if (!bucket || now >= bucket.resetAt) return 0;
  return bucket.count >= max ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

function recordFailure(map: Map<string, Bucket>, key: string, now: number) {
  const bucket = map.get(key);
  if (bucket && now < bucket.resetAt) {
    bucket.count += 1;
  } else {
    map.set(key, { count: 1, resetAt: now + config.loginRateLimit.windowMs });
  }
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  if (config.loginRateLimit.disabled) return next();

  const now = Date.now();
  sweep(now);

  const ip = req.ip ?? 'unknown';
  const username = String(req.body?.username ?? '').toLowerCase().trim();
  // Requests with no username can't be attributed to an account, so they only
  // count against the IP bucket. The controller rejects them with a 400 anyway.
  const accountKey = username || null;

  const { maxPerAccount, maxPerIp } = config.loginRateLimit;
  const retryAfter = Math.max(
    accountKey ? isBlocked(accountAttempts, accountKey, maxPerAccount, now) : 0,
    isBlocked(ipAttempts, ip, maxPerIp, now),
  );

  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many failed login attempts. Try again later.',
      retryAfter,
    });
  }

  // Record the outcome once the controller has responded. Only a 401 (bad
  // credentials) counts as a failure — 400s and 500s are not guesses.
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode === 401) {
      if (accountKey) recordFailure(accountAttempts, accountKey, now);
      recordFailure(ipAttempts, ip, now);
    } else if (res.statusCode === 200 && accountKey) {
      // Correct password proves this isn't a guessing run against this account.
      // The IP bucket is deliberately left alone so one valid credential can't
      // be used to reset a spray counter.
      accountAttempts.delete(accountKey);
    }
    return originalJson(body);
  };

  next();
}
