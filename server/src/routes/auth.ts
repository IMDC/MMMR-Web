import { Router, Request, Response, NextFunction } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { login, logout, me } from '../controllers/authController';

const router = Router();

// Simple in-memory brute-force protection: max 5 attempts per IP per 15 minutes.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    entry.count += 1;
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  // On successful login, clear the counter for this IP.
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode === 200) attempts.delete(ip);
    return originalJson(body);
  };

  next();
}

router.post('/login', loginRateLimit, asyncWrapper(login));
router.post('/logout', asyncWrapper(logout));
router.get('/me', asyncWrapper(me));

export default router;
