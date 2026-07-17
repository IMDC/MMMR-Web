import { Request, Response, NextFunction } from 'express';

// Gate: requires a logged-in session. Populates req.userId for downstream handlers.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.userId = userId;
  next();
}
