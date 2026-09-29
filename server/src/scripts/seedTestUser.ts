/**
 * Seed (or reset) ONE test user for exercising the forced-password-change flow.
 *
 * Deliberately separate from seedUsers.ts: that script rewrites all 84 study
 * participants' passwords, which is not something you want to trigger just to
 * test a login. This touches exactly one account.
 *
 * Safe to re-run — it upserts, so it doubles as the "reset" half of the loop:
 * the password goes back to the seed value and mustChangePassword returns to
 * true, putting the account back at step 1 of the flow.
 *
 *   npx tsx src/scripts/seedTestUser.ts                        # testuser / Test1234!
 *   npx tsx src/scripts/seedTestUser.ts myuser 'MyPass123!'    # custom
 *
 * Refuses to run against a non-local database so a stray invocation can't
 * reset an account on the deployed VPS.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { User } from '../models/User';
import { VideoSet } from '../models/VideoSet';

const username = (process.argv[2] || 'testuser').toLowerCase();
const password = process.argv[3] || 'Test1234!';

const DEFAULT_SETS = [
  'Work',
  'Holiday',
  'Social',
  'Family & Friends',
  'Entertainment',
  'Errands & Household',
];

async function run() {
  if (!/localhost|127\.0\.0\.1/.test(config.mongoUri)) {
    console.error(`Refusing to seed a test user against a non-local database:\n  ${config.mongoUri}`);
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);
  console.log('Connected to', config.mongoUri);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { username },
    {
      $set: { username, passwordHash, displayName: username, mustChangePassword: true },
      // Clear onboarding state so the account replays the first-login
      // experience (consent, auto-transcribe prompts) exactly as a new user.
      $unset: { aiConsent: '', autoTranscribe: '', summaryFormat: '', recordingInfoDismissed: '' },
    },
    { upsert: true, new: true },
  );

  const userId = user._id as mongoose.Types.ObjectId;
  const existing = await VideoSet.find({ userId, name: { $in: DEFAULT_SETS } }).select('name');
  const existingNames = new Set(existing.map(s => s.name));
  const toCreate = DEFAULT_SETS.filter(n => !existingNames.has(n));
  if (toCreate.length > 0) {
    await VideoSet.insertMany(
      toCreate.map(name => ({ userId, name, datetime: new Date(), videoIDs: [] })),
    );
  }

  console.log(`\n✓ ${user.username} (${userId})`);
  console.log(`  password            : ${password}`);
  console.log(`  mustChangePassword  : ${user.mustChangePassword}`);
  console.log(`  video sets          : ${toCreate.length > 0 ? `created ${toCreate.length}` : 'already present'}`);
  console.log(`\nLog in at http://localhost:3000 — you should be forced to change the password.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
