import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

function publicUser(user: { _id: any; username: string; displayName: string }) {
  return { id: user._id.toString(), username: user.username, displayName: user.displayName };
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.userId = user._id.toString();
  res.json(publicUser(user));
}

export async function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie('mhmr.sid');
    res.json({ message: 'Logged out' });
  });
}

export async function me(req: Request, res: Response) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = await User.findById(userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json(publicUser(user));
}
