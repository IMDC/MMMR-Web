import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

function publicUser(user: { _id: any; username: string; displayName: string; mustChangePassword?: any; aiConsent?: any; autoTranscribe?: any; summaryFormat?: any; recordingInfoDismissed?: any }) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    mustChangePassword: user.mustChangePassword ?? false,
    aiConsent: user.aiConsent ?? null,
    autoTranscribe: user.autoTranscribe ?? null,
    summaryFormat: user.summaryFormat ?? 'both',
    recordingInfoDismissed: user.recordingInfoDismissed ?? false,
  };
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

  // Regenerate the session ID on every successful login to prevent session fixation.
  // An attacker who plants a known session cookie before login cannot reuse it after.
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });

    // If the user must change their password, do NOT establish a real session yet.
    // Store a pending slot instead — it grants no access to protected routes.
    // The session is only promoted to a full userId after changePassword succeeds.
    if (user.mustChangePassword) {
      req.session.pendingUserId = user._id.toString();
    } else {
      req.session.userId = user._id.toString();
    }

    req.session.save((err2) => {
      if (err2) return res.status(500).json({ error: 'Session error' });
      res.json(publicUser(user));
    });
  });
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

export async function updatePreferences(req: Request, res: Response) {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { displayName, aiConsent, autoTranscribe, summaryFormat, recordingInfoDismissed } = req.body;
  const update: Record<string, any> = {};
  if (displayName !== undefined) update.displayName = String(displayName).trim().slice(0, 40);
  if (aiConsent !== undefined) update.aiConsent = aiConsent;
  if (autoTranscribe !== undefined) update.autoTranscribe = autoTranscribe;
  if (summaryFormat !== undefined) update.summaryFormat = summaryFormat;
  if (recordingInfoDismissed !== undefined) update.recordingInfoDismissed = recordingInfoDismissed;

  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json(publicUser(user));
}

function validateNewPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return 'Password must include at least one number or special character.';
  return null;
}

export async function changePassword(req: Request, res: Response) {
  // Accept both a full session (already-authed user changing password from settings)
  // and a pending session (first-login forced change before a real session exists).
  const userId = req.session?.userId ?? req.session?.pendingUserId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentOk) return res.status(401).json({ error: 'Current password is incorrect' });

  const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsOld) return res.status(400).json({ error: 'New password must be different from your current password' });

  const ruleError = validateNewPassword(newPassword);
  if (ruleError) return res.status(400).json({ error: ruleError });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await User.findByIdAndUpdate(userId, { passwordHash, mustChangePassword: false }, { new: true });
  if (!updated) return res.status(404).json({ error: 'User not found' });

  // Promote the pending slot to a real authenticated session.
  req.session.userId = updated._id.toString();
  req.session.pendingUserId = undefined;

  res.json(publicUser(updated));
}
