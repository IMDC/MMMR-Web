import 'express';
import 'express-session';

// Augment Express Request with the authenticated user's id, populated by requireAuth.
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

// Store the logged-in user's id on the session.
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
