# Password Reset — Design Plan

> Status: Not yet implemented. Revisit before participant launch.

## How Passwords Work Now

- `seedUsers.ts` calls `bcrypt.hash(password, 10)` and stores the result in `User.passwordHash`
- Login: `bcrypt.compare(plaintext, hash)` — sound
- `publicUser()` helper explicitly excludes `passwordHash` from every API response
- Session-based auth (express-session); no JWT
- Rate limiting: 5 failed attempts / IP / 15 min window

## Goal

Participants receive temporary credentials (e.g. participant1 / pass1) from the researcher. On first login they are forced to set a personal password. The temporary one is then invalid. The new password is bcrypt-hashed server-side — plaintext never touches the database.

## Implementation Plan

### 1. `server/src/models/User.ts`
Add one field:
```ts
mustChangePassword: { type: Boolean, default: true }
```
New and re-seeded users will have this `true` automatically.

### 2. `server/src/controllers/authController.ts`
- Add `mustChangePassword` to `publicUser()` return shape
- Add `changePassword` handler:
  - Requires authenticated session
  - Body: `{ currentPassword, newPassword }`
  - Validates `newPassword` length (≥ 8 chars), not identical to `currentPassword`
  - `bcrypt.compare(currentPassword, user.passwordHash)` — rejects if wrong
  - `bcrypt.hash(newPassword, 10)` — fresh hash
  - Single `findByIdAndUpdate(userId, { passwordHash: newHash, mustChangePassword: false })`
  - Returns updated `publicUser`

### 3. `server/src/routes/auth.ts`
```ts
router.post('/change-password', requireAuth, asyncWrapper(changePassword));
```

### 4. `server/src/scripts/seedUsers.ts`
Add `mustChangePassword: true` explicitly in the upsert so re-seeding resets the flag (useful when re-issuing a temp credential).

### 5. `client/src/api/auth.ts`
- Add `mustChangePassword: boolean` to `AuthUser` interface
- Add:
```ts
changePassword: (currentPassword: string, newPassword: string) =>
  apiClient.post<AuthUser>('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
```

### 6. `client/src/store/authStore.ts`
Add `changePassword(current: string, newPass: string): Promise<void>` action — calls API, updates `user` in store.

### 7. `client/src/components/common/ForcePasswordChangeModal.tsx` (new file)
Full-screen modal — **cannot be dismissed** (no backdrop click, no Escape, no X).

Fields:
- Current password
- New password (min 8 chars enforced client-side)
- Confirm new password

On success modal disappears (`mustChangePassword` is now `false` in store).

### 8. `client/src/components/layout/Layout.tsx`
```tsx
{user?.mustChangePassword && <ForcePasswordChangeModal />}
```
Renders on top of everything immediately after login.

## Security Properties

| Concern | How it's handled |
|---|---|
| Plaintext password in DB | Never — bcrypt hash replaces hash atomically |
| Old hash exposure | Overwritten in same DB write that clears `mustChangePassword` |
| Network interception | HTTPS in production (Traefik TLS) |
| Current password verification | Always required before accepting new password |
| Same-password reuse | Rejected client-side |

## Verification Checklist
1. Run seed → confirm `mustChangePassword: true` in Mongo
2. Log in with temp password → modal appears, cannot be dismissed
3. Enter wrong current password → error shown
4. Enter new password < 8 chars → client blocks
5. Enter valid credentials → modal closes, app accessible
6. Log out, log in with new password → no modal
7. Log in with old (temp) password → rejected
8. Re-run seed → `mustChangePassword` reset to true for all users
