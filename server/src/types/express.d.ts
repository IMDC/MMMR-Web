import 'express';
import 'express-session';

// Augment Express Request with the authenticated user's id, populated by requireAuth.
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

// Store the logged-in user's id on the session.
// pendingUserId is a pre-auth slot used only during the forced password-change flow.
// It does NOT grant access to protected routes — only userId does.
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    pendingUserId?: string;
  }
}
